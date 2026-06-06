'use server';

import { BusinessShop } from '@/providers/BusinessProvider';
import { createServerSupabaseClient } from '@/supabase/server';

export async function createBusiness(payload: FormData) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // 1. Extract Files
  const shop_logo = payload.get('shop_logo') as File;
  const shop_banner = payload.get('shop_banner') as File;
  const interior_images = payload.getAll('interior_images') as File[];
  const business_license = payload.get('business_license') as File;
  const tax_certificate = payload.get('tax_certificate') as File;

  // 2. Extract Metadata & Parse JSON strings
  const shop_name = payload.get('shop_name') as string;
  const description = payload.get('description') as string;
  const business_category = JSON.parse(
    payload.get('business_category') as string,
  );
  const location = JSON.parse(payload.get('location') as string);
  const category_id = (payload.get('category_id') as string) || null;

  // 3. Insert the business row first so storage RLS policies can verify
  // that the uploading user owns the business matching the folder name.
  // File URL columns are nullable — they get filled in step 5.
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

  // 4. Upload files. Paths use business.id as the folder so the RLS policy:
  //    "WHERE businesses.id = folder AND businesses.owner_id = auth.uid()"
  //    resolves correctly now that the row exists.
  const uploadFile = async (bucket: string, file: File, path: string) => {
    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
    if (error) throw new Error(`Upload to ${bucket} failed: ${error.message}`);
    return data.path;
  };

  let logoPath: string;
  let bannerPath: string;
  let licensePath: string;
  let taxPath: string;
  let interiorPaths: string[];

  try {
    const ts = Date.now();
    logoPath = await uploadFile(
      'shop-logos',
      shop_logo,
      `${business.id}/logo-${ts}.png`,
    );
    bannerPath = await uploadFile(
      'shop-banners',
      shop_banner,
      `${business.id}/banner-${ts}.png`,
    );
    licensePath = await uploadFile(
      'business-docs',
      business_license,
      `${business.id}/license-${ts}.pdf`,
    );
    taxPath = await uploadFile(
      'business-docs',
      tax_certificate,
      `${business.id}/tax-cert-${ts}.pdf`,
    );
    interiorPaths = await Promise.all(
      interior_images.map((file, idx) =>
        uploadFile(
          'interior-images',
          file,
          `${business.id}/interior-${ts}-${idx}.${file.name.split('.').pop() ?? 'jpg'}`,
        ),
      ),
    );
  } catch (uploadError) {
    // Roll back the business row so the user can retry cleanly
    await supabase.from('businesses').delete().eq('id', business.id);
    throw uploadError;
  }

  // 5. Patch the business row with the resolved file paths
  const { data, error: updateError } = await supabase
    .from('businesses')
    .update({
      logo_url: logoPath,
      banner_url: bannerPath,
      interior_images: interiorPaths,
      verification_documents: {
        business_license: licensePath,
        tax_certificate: taxPath,
      },
    })
    .eq('id', business.id)
    .select()
    .single();
  if (updateError) {
    await supabase.from('businesses').delete().eq('id', business.id);
    throw updateError;
  }

  // 6. Create a branch so the business appears in nearby searches.
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
    business_id: data.id,
    name: shop_name,
    address: formattedAddress,
  };
  if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
    branchPayload.location = `POINT(${lng} ${lat})`;
  }

  await supabase.from('branches').insert(branchPayload);

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
