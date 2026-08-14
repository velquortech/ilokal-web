'use server';

import { BusinessShop } from '@/providers/BusinessProvider';
import { createServerSupabaseClient } from '@/supabase/server';
import { uploadWebP, IMAGE_PRESETS } from '@/lib/api/helpers/image';
import { MAX_REGISTRATION_OFFERINGS } from '@/lib/validation/products';
import { logActionError } from '@/lib/utils/captureError';
import type { DiscountValue } from '@/lib/types';

// Registration is split into two phases so no single request exceeds Vercel's
// 4.5 MB function body limit (a one-shot multipart POST with logo + banner +
// 4+ interior images + 2 docs reached ~16 MB and 413'd in production):
//   1. createBusinessDraft(meta)         — JSON metadata only, creates row + branch
//   2. uploadBusinessRegistrationFile(…) — one file per request (each ≤ 2 MB)

export type RegistrationFileKind =
  | 'shop_logo'
  | 'shop_banner'
  | 'interior_image'
  | 'business_license'
  | 'tax_certificate'
  // A photo for one of the offerings entered in the wizard. Unlike every kind
  // above it updates NO column on `businesses` — the row it belongs to does
  // not exist yet — so it returns the stored path for the offerings write to
  // carry. It rides this route rather than `uploadProductImageAction` because
  // that action calls `verifyBusinessOwner()` with no argument, which falls
  // back to whichever shop `.limit(1)` returns.
  | 'offering_image';

export interface BusinessDraftMeta {
  shop_name: string;
  description: string;
  business_category: Record<string, unknown>;
  category_id: string | null;
  location: Record<string, unknown>;
}

export async function createBusinessDraft(meta: BusinessDraftMeta) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { shop_name, description, business_category, category_id, location } =
    meta;

  // Insert the business row first so storage RLS policies can verify that the
  // uploading user owns the business matching the folder name. File URL
  // columns are nullable — they get filled by the per-file upload requests.
  const { data: business, error: insertError } = await supabase
    .from('businesses')
    .insert([
      {
        owner_id: user.id,
        shop_name,
        description,
        business_category,
        category_id,
        location,
      },
    ])
    .select()
    .single();
  if (insertError) throw insertError;

  // Create a branch so the business appears in nearby searches.
  // The nearby_businesses SQL function JOINs on branches.location (PostGIS GEOGRAPHY),
  // but registration only stores a JSON address — no branch row means the business
  // is invisible to the mobile app regardless of verification status.
  const geometryStr = (location.geometry as string) ?? '';
  const latMatch = geometryStr.match(/lat:([^,]+)/);
  const lngMatch = geometryStr.match(/lng:(.+)/);
  const lat = latMatch ? parseFloat(latMatch[1]) : null;
  const lng = lngMatch ? parseFloat(lngMatch[1]) : null;

  const formattedAddress = [
    location.street_address,
    location.barangay,
    location.city,
    location.province,
    location.zip_code,
  ]
    .filter(Boolean)
    .join(', ');

  const branchPayload: Record<string, unknown> = {
    business_id: business.id,
    name: shop_name,
    address: formattedAddress,
  };
  if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
    branchPayload.location = `POINT(${lng} ${lat})`;
  }

  await supabase.from('branches').insert(branchPayload);

  return business;
}

export async function uploadBusinessRegistrationFile(
  businessId: string,
  kind: RegistrationFileKind,
  file: File,
  index = 0,
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Ownership check — the RLS-scoped client also enforces this, but failing
  // early gives the caller a clean error instead of a silent no-op update.
  const { data: business, error: fetchError } = await supabase
    .from('businesses')
    .select('id, interior_images, verification_documents')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!business) throw new Error('Business not found');

  const uploadRaw = async (bucket: string, path: string) => {
    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
    if (error) throw new Error(`Upload to ${bucket} failed: ${error.message}`);
    return data.path;
  };

  // Display images are downscaled + re-encoded to WebP at write time (the free
  // Supabase plan has no on-the-fly transform) via the shared uploadWebP helper.
  // Docs (license/tax PDFs) keep the raw upload path — converting them would
  // corrupt non-image bytes.
  const uploadImage = (bucket: string, path: string, maxDimension: number) =>
    uploadWebP(supabase, bucket, path, file, { maxDimension, upsert: true });

  const ts = Date.now();

  // Offering photos return early: there is no column on `businesses` to put
  // them in, and the `products` row they belong to is written afterwards by
  // `createBusinessRegistrationOfferings`. The bucket's own INSERT policy
  // (`foldername[1] = businesses.id AND owner AND not archived`) is what makes
  // this path safe — and is also why nothing can be uploaded before the draft
  // exists.
  //
  // The bucket-relative PATH is returned, never an absolute URL: mixing the
  // two in one column is what made the gallery diff match nothing and delete
  // live files (2026-08-06).
  if (kind === 'offering_image') {
    const path = await uploadImage(
      'product-images',
      `${businessId}/offering-${ts}-${index}.webp`,
      IMAGE_PRESETS.product,
    );
    return { path };
  }

  let update: Record<string, unknown>;

  switch (kind) {
    case 'shop_logo': {
      const path = await uploadImage(
        'shop-logos',
        `${businessId}/logo-${ts}.webp`,
        IMAGE_PRESETS.logo,
      );
      update = { logo_url: path };
      break;
    }
    case 'shop_banner': {
      const path = await uploadImage(
        'shop-banners',
        `${businessId}/banner-${ts}.webp`,
        IMAGE_PRESETS.hero,
      );
      update = { banner_url: path };
      break;
    }
    case 'interior_image': {
      const path = await uploadImage(
        'interior-images',
        `${businessId}/interior-${ts}-${index}.webp`,
        IMAGE_PRESETS.hero,
      );
      // Client uploads sequentially, so read-modify-write is race-free here.
      const existing: string[] = business.interior_images ?? [];
      update = { interior_images: [...existing, path] };
      break;
    }
    case 'business_license': {
      const path = await uploadRaw(
        'business-docs',
        `${businessId}/license-${ts}.pdf`,
      );
      update = {
        verification_documents: {
          ...(business.verification_documents ?? {}),
          business_license: path,
        },
      };
      break;
    }
    case 'tax_certificate': {
      const path = await uploadRaw(
        'business-docs',
        `${businessId}/tax-cert-${ts}.pdf`,
      );
      update = {
        verification_documents: {
          ...(business.verification_documents ?? {}),
          tax_certificate: path,
        },
      };
      break;
    }
  }

  const { data, error: updateError } = await supabase
    .from('businesses')
    .update(update)
    .eq('id', businessId)
    .select()
    .single();
  if (updateError) throw updateError;

  return data;
}

// 2. READ: Get a business by ID
export async function getBusiness(id: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .is('archived_at', null) // Ensure we only get non-archived items
    .single();

  if (error) throw error;
  return data;
}

// 3. READ: Get all businesses for the current owner
/**
 * Just the id of the shop this owner has, or null.
 *
 * `getMyBusinesses` reads `select('*')` and resolves three storage URLs, which
 * is a lot of work for a caller that only wants to know whether to redirect.
 * Same scope as that query — live rows, owner-scoped — so the two cannot
 * disagree about whether a shop exists.
 */
export async function getOwnedBusinessId(
  ownerId: string,
): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', ownerId)
      .is('archived_at', null)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? null;
  } catch (err) {
    // Logged, not swallowed silently: a transient failure and "no shop" lead
    // to the same render, and only one of them is worth knowing about.
    logActionError('getOwnedBusinessId', err);
    return null;
  }
}

export async function getMyBusinesses() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('businesses')
    .select('*') // logo_url: logoUrl,
    // banner_url: bannerUrl
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  // Seeds store full public URLs; real registration stores raw storage paths.
  // Resolve to a public URL only when the stored value is a path (not already a URL).
  const resolveUrl = (
    bucket: string,
    pathOrUrl: string | null,
  ): string | null => {
    if (!pathOrUrl) return null;
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    return supabase.storage.from(bucket).getPublicUrl(pathOrUrl).data.publicUrl;
  };

  const logoUrl = resolveUrl('shop-logos', data.logo_url);
  const bannerUrl = resolveUrl('shop-banners', data.banner_url);
  const interiorPaths = data?.interior_images?.map(
    (url: string) => resolveUrl('interior-images', url) ?? url,
  );

  return {
    ...data,
    logo_url: logoUrl,
    banner_url: bannerUrl,
    interior_images: interiorPaths,
  } as BusinessShop;
}

// Get a single business by its ID (no ownership check — callers must verify)
export async function getBusinessById(
  id: string,
): Promise<BusinessShop | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle();

  if (error || !data) return null;

  const resolveUrl = (
    bucket: string,
    pathOrUrl: string | null,
  ): string | null => {
    if (!pathOrUrl) return null;
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://'))
      return pathOrUrl;
    return supabase.storage.from(bucket).getPublicUrl(pathOrUrl).data.publicUrl;
  };

  return {
    ...data,
    logo_url: resolveUrl('shop-logos', data.logo_url),
    banner_url: resolveUrl('shop-banners', data.banner_url),
    interior_images: data?.interior_images?.map(
      (url: string) => resolveUrl('interior-images', url) ?? url,
    ),
  } as BusinessShop;
}

// 4. UPDATE: Modify existing business details
export async function updateBusiness(
  id: string,
  updates: Partial<BusinessShop>,
) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 5. DELETE: Soft delete (archiving)
export async function deleteBusiness(id: string) {
  const supabase = await createServerSupabaseClient();

  // Update the 'archived_at' column instead of physically removing the row
  const { data, error } = await supabase
    .from('businesses')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Phase 3 — write the offerings entered in the registration wizard.
 *
 * Separate request from the draft and from the files, for the same reason
 * those two are separate: one all-in-one POST is what 413'd in production.
 *
 * Idempotent by NAME within the business. The client replays its whole
 * submission after a 404 (a stale draft id) and can be re-submitted after a
 * network failure mid-flight, so "write these items" must be safe to call
 * twice — otherwise one retry doubles the owner's menu. Name is the right key
 * here: this runs once, against a brand-new shop, and two items with the same
 * name at registration is a duplicate rather than a deliberate pair.
 */
export interface RegistrationOfferingInput {
  name: string;
  price: number | null;
  on_request: boolean;
  /**
   * Bucket-relative path returned by the `offering_image` upload, or null.
   * Re-checked against the VERIFIED business id below — a caller could
   * otherwise point a row at any object in the bucket.
   */
  image_url?: string | null;
}

export async function createBusinessRegistrationOfferings(
  businessId: string,
  offerings: RegistrationOfferingInput[],
  kind: 'product' | 'service',
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Ownership proved against the ROUTE's id before anything is written, and
  // the verified row's id is what gets written — never the caller's string.
  const { data: business, error: fetchError } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!business) throw new Error('Business not found');

  const { data: existing, error: existingError } = await supabase
    .from('products')
    .select('name')
    .eq('business_id', business.id)
    .is('archived_at', null);
  if (existingError) throw existingError;

  const taken = new Set(
    (existing ?? []).map((row) => row.name.trim().toLowerCase()),
  );

  const rows: {
    business_id: string;
    name: string;
    price: number | null;
    price_type: 'fixed' | 'on_request';
    status: 'active';
    kind: 'product' | 'service';
    image_url: string | null;
  }[] = [];

  /**
   * Only a path this upload route just produced for THIS business.
   *
   * The client sends the path back, so without this an attacker could set any
   * row's image to any object in the bucket — including another shop's. The
   * bucket is public-read, so that is a real cross-shop read, not a
   * theoretical one.
   *
   * A stored PATH, never an absolute URL: mixing the two in one column is what
   * made the gallery diff match nothing and delete live files (2026-08-06).
   */
  const ownedImagePath = (value: string | null | undefined): string | null => {
    if (typeof value !== 'string' || value.length === 0) return null;
    if (value.includes('://') || value.startsWith('//')) return null;
    if (value.includes('..')) return null;
    return value.startsWith(`${business.id}/`) ? value : null;
  };

  for (const offering of offerings.slice(0, MAX_REGISTRATION_OFFERINGS)) {
    const name = offering.name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    // Skips both a replay of a previous run and a duplicate inside this batch.
    if (taken.has(key)) continue;
    taken.add(key);

    rows.push({
      business_id: business.id,
      name,
      // The DB CHECK allows NULL only for 'on_request'; a form that produced
      // anything else here would be rejected by the database, not silently
      // stored.
      price: offering.on_request ? null : offering.price,
      price_type: offering.on_request ? 'on_request' : 'fixed',
      // ACTIVE, not the column default. Both the setup checklist and
      // `admin_businesses_missing_menu` count only `status = 'active'`, so an
      // 'unlisted' row would satisfy this step, leave the public page empty,
      // and still earn the owner a "you have no menu" reminder.
      status: 'active',
      // Sent EXPLICITLY: the DB defaults `kind` to 'product' and cannot tell an
      // omitted field from a deliberate one, so a services business would
      // otherwise mint products at registration (the offerings phase-1 decay).
      kind,
      image_url: ownedImagePath(offering.image_url),
    });
  }

  if (rows.length === 0) return { created: 0 };

  const { error, count } = await supabase
    .from('products')
    .insert(rows, { count: 'exact' });
  if (error) throw error;

  return { created: count ?? rows.length };
}

/**
 * Phase 4 — the optional launch deal entered in the registration wizard.
 *
 * Idempotent by CODE within the business, for the same reason the offerings
 * write is idempotent by name: the client replays its whole submission after a
 * 404 and can be re-submitted after a mid-flight failure, so this must be safe
 * to call twice.
 */
export interface RegistrationDealInput {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free' | 'bogo';
  discount_value: number | null;
  /** Present only for bogo. */
  bogo_buy?: number;
  /** Present only for bogo. */
  bogo_get?: number;
  duration_days: number;
  publish: boolean;
  /** Bucket-relative path, proved against the verified business id below. */
  image_url?: string | null;
}

export async function createBusinessRegistrationDeal(
  businessId: string,
  deal: RegistrationDealInput,
) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: business, error: fetchError } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!business) throw new Error('Business not found');

  const code = deal.code.trim().toUpperCase();

  const { data: existing, error: existingError } = await supabase
    .from('coupons')
    .select('id')
    .eq('business_id', business.id)
    .eq('code', code)
    .is('archived_at', null)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { created: false };

  // The flat wizard fields → the stored `DiscountValue` union (same shapes
  // the dashboard coupon dialog writes, so both surfaces stay renderable by
  // the one formatter).
  const discount: DiscountValue =
    deal.discount_type === 'bogo'
      ? {
          type: 'bogo',
          buy: deal.bogo_buy ?? 1,
          get: deal.bogo_get ?? 1,
          value: null,
        }
      : deal.discount_type === 'free'
        ? { type: 'free', value: null }
        : { type: deal.discount_type, value: deal.discount_value ?? 0 };

  // Same rule as the offerings write: the client sends this back, so only a
  // path under the VERIFIED business id is stored. The bucket is public-read,
  // so a foreign path would be a real cross-shop read.
  const ownedImagePath = (value: string | null | undefined): string | null => {
    if (typeof value !== 'string' || value.length === 0) return null;
    if (value.includes('://') || value.startsWith('//')) return null;
    if (value.includes('..')) return null;
    return value.startsWith(`${business.id}/`) ? value : null;
  };

  const startDate = new Date();
  const expiryDate = new Date(
    startDate.getTime() + deal.duration_days * 24 * 60 * 60 * 1000,
  );

  const { error } = await supabase.from('coupons').insert({
    business_id: business.id,
    branch_id: null,
    promotion_type: 'coupon',
    // 🔴 The owner's explicit choice, defaulting to draft. A published coupon
    // inside its window enters `mobile_deals` — the app's Deals front page —
    // and is immediately redeemable: a real `user_redemptions` row, a real
    // cashier code, a real owner notification. Never assume this.
    status: deal.publish ? 'published' : 'draft',
    code,
    description: deal.description?.trim() || null,
    discount,
    usage_scope: 'any',
    scope_values: null,
    start_date: startDate.toISOString(),
    expiry_date: expiryDate.toISOString(),
    image_url: ownedImagePath(deal.image_url),
  });
  if (error) throw error;

  return { created: true };
}
