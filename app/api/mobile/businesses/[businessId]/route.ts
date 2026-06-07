import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  notFoundResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    const supabase = createBearerClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(
        `
        id, shop_name, description, logo_url, interior_images, status,
        business_category,
        profiles!owner_id(full_name, email),
        business_categories!category_id(name, business_types!business_type_id(name, icon))
      `,
      )
      .eq('id', businessId)
      .eq('status', 'verified')
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return notFoundResponse({ message: 'Business not found' });
    }

    // branches.location is PostGIS — decode lat/lng via the business_branches RPC
    // (the nested PostgREST select above can't expose geometry coordinates).
    // Follower count comes from the get_follower_counts RPC (counts only — the
    // follow graph stays private); independent of the branches RPC, so parallel.
    const [{ data: branchRows }, { data: followerRows }] = await Promise.all([
      supabase.rpc('business_branches', { p_business_id: businessId }),
      supabase.rpc('get_follower_counts', { p_business_ids: [businessId] }),
    ]);
    const followerCount = Number(
      (
        followerRows as { business_id: string; follower_count: number }[] | null
      )?.[0]?.follower_count ?? 0,
    );
    const branches = (
      (branchRows ?? []) as {
        id: string;
        name: string;
        address: string | null;
        latitude: number | null;
        longitude: number | null;
      }[]
    ).map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      latitude: b.latitude,
      longitude: b.longitude,
    }));

    const owner =
      (data.profiles as unknown as {
        full_name: string | null;
        email: string;
      } | null) ?? null;
    const ownerHandle = owner
      ? (owner.full_name?.split(' ')[0] ?? owner.email.split('@')[0])
      : null;

    type CategoryRow = {
      name: string;
      business_types: { name: string; icon: string } | null;
    } | null;
    const categoryRow = data.business_categories as unknown as CategoryRow;

    type JsonbCategory = {
      type: 'predefined' | 'custom';
      name: string;
      description?: string;
    } | null;
    const jsonbCategory = data.business_category as unknown as JsonbCategory;

    const category = categoryRow
      ? {
          name: categoryRow.name,
          business_type: categoryRow.business_types?.name ?? null,
          icon: categoryRow.business_types?.icon ?? null,
        }
      : jsonbCategory?.name
        ? { name: jsonbCategory.name, business_type: null, icon: null }
        : null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profiles, business_categories, business_category, ...rest } = data;

    const business = {
      ...rest,
      logo_url: resolveStorageUrl(supabase, 'shop-logos', data.logo_url),
      interior_images:
        data.interior_images?.map((url: string) =>
          resolveStorageUrl(supabase, 'interior-images', url),
        ) ?? [],
      owner_handle: ownerHandle,
      category,
      branches,
      total_followers: followerCount ?? 0,
    };

    return successResponse({ business });
  } catch {
    return generalErrorResponse();
  }
}
