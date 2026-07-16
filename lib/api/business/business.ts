'use server';

import { BusinessShop } from '@/providers/BusinessProvider';
import { createServerSupabaseClient } from '@/supabase/server';
import { uploadWebP, IMAGE_PRESETS } from '@/lib/api/helpers/image';

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
  | 'tax_certificate';

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
