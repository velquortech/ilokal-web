'use server';

import { BusinessShop } from '@/providers/BusinessProvider';
import { createServerSupabaseClient } from '@/supabase/server';

export async function createBusiness(payload: FormData) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // 1. Helper for consistent uploads and fixing 2-byte corruption
  const uploadFile = async (bucket: string, file: File, path: string) => {
    const arrayBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

    if (error) throw new Error(`Upload to ${bucket} failed: ${error.message}`);
    return data.path;
  };

  // 2. Extract Files
  const shop_logo = payload.get('shop_logo') as File;
  const shop_banner = payload.get('shop_banner') as File;
  const interior_images = payload.getAll('interior_images') as File[];
  const business_license = payload.get('business_license') as File;
  const tax_certificate = payload.get('tax_certificate') as File;

  // 3. Extract Metadata & Parse JSON strings
  const shop_name = payload.get('shop_name') as string;
  const description = payload.get('description') as string;
  const business_category = JSON.parse(
    payload.get('business_category') as string,
  );
  const location = JSON.parse(payload.get('location') as string);

  // 4. Perform Uploads
  const logoPath = await uploadFile(
    'shop-logos',
    shop_logo,
    `${user.id}/logo-${Date.now()}.png`,
  );
  const bannerPath = await uploadFile(
    'shop-banners',
    shop_banner,
    `${user.id}/banner-${Date.now()}.png`,
  );

  const licensePath = await uploadFile(
    'business-docs',
    business_license,
    `${user.id}/license-${Date.now()}.pdf`,
  );
  const taxPath = await uploadFile(
    'business-docs',
    tax_certificate,
    `${user.id}/tax-cert-${Date.now()}.pdf`,
  );

  const interiorPaths = await Promise.all(
    interior_images.map((file) =>
      uploadFile(
        'interior-images',
        file,
        `${user.id}/interior-${Date.now()}-${file.name}`,
      ),
    ),
  );

  // 5. Insert into DB
  const { data, error } = await supabase
    .from('businesses')
    .insert([
      {
        owner_id: user.id,
        shop_name,
        description,
        business_category,
        location,
        logo_url: logoPath,
        banner_url: bannerPath,
        interior_images: interiorPaths,
        verification_documents: {
          business_license: licensePath,
          tax_certificate: taxPath,
        },
      },
    ])
    .select()
    .single();
  if (error) throw error;
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
