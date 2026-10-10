import { createBearerClient } from '@/supabase/bearer';
import { getAdminSeededVisible } from '@/lib/api/appSettings';
import {
  loggedServerError,
  notFoundResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { isValidResourceId } from '@/app/api/helpers/resourceId';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { getBlurhashes } from '@/lib/api/helpers/blurhash';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

// Public business detail — semi-static. On-demand ISR: cache per businessId and
// revalidate every 2 min so repeat opens don't re-query PostgREST. (P10)
export const revalidate = 120;

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    // A slug (`bida-ngayon`) reaching PostgREST as a `uuid` is a 22P02 and a
    // 500 for what is really "no such shop". See app/api/helpers/resourceId.ts.
    if (!isValidResourceId(businessId)) {
      return notFoundResponse({ message: 'Business not found' });
    }
    const supabase = createBearerClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(
        `
        id, shop_name, description, logo_url, banner_url, interior_images, status,
          origin, claimed_at,
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

    // Destructured only to EXCLUDE them from `rest`: the nested relations are
    // reshaped into `category` above, and origin/claimed_at are inputs to
    // `is_claimed` below rather than fields the app should receive.
    // The admin-seeded kill switch. A shared link is the hole an owner who
    // objects would find first, so hiding a listing from the feed is not enough
    // — the direct route has to 404 it too. 404, not 403: the listing simply
    // does not exist as far as this caller is concerned.
    if (data.origin === 'admin' && !(await getAdminSeededVisible())) {
      return notFoundResponse({ message: 'Business not found' });
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      profiles,
      business_categories,
      business_category,
      origin,
      claimed_at,
      ...rest
    } = data;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    // Placeholders for the logo and EVERY gallery photo, index-aligned with
    // `interior_images` — the detail screen's hero carousel shows them all.
    const interiorRefs = ((data.interior_images ?? []) as string[]).map(
      (pathOrUrl) => ({ bucket: 'interior-images', pathOrUrl }),
    );
    const logoRef = { bucket: 'shop-logos', pathOrUrl: data.logo_url };
    const blurhashOf = await getBlurhashes(supabase, [
      logoRef,
      ...interiorRefs,
    ]);

    const business = {
      ...rest,
      logo_blur_hash: blurhashOf(logoRef),
      interior_blur_hashes: interiorRefs.map(blurhashOf),
      logo_url: resolveStorageUrl(supabase, 'shop-logos', data.logo_url),
      banner_url: resolveStorageUrl(supabase, 'shop-banners', data.banner_url),
      interior_images:
        data.interior_images?.map((url: string) =>
          resolveStorageUrl(supabase, 'interior-images', url),
        ) ?? [],
      owner_handle: ownerHandle,
      // Whether an owner stands behind this listing. The detail screen drew
      // its check badge unconditionally, asserting something untrue about the
      // ~1,480 admin-listed directory entries — and a user arriving by shared
      // link has no nearby-feed cache to infer it from, so it has to come from
      // here. Mirrors `nearby_businesses_filtered`: an admin listing counts as
      // claimed once someone claims it, an owner-registered one by construction.
      is_claimed: claimed_at !== null || origin === 'owner',
      category,
      branches,
      total_followers: followerCount ?? 0,
    };

    return successResponse({ business });
  } catch (error) {
    // Was a bare `catch {}`: the cause was destroyed, so a 500 on this route —
    // public business detail, one of the hottest reads in the app — was
    // observable by no means at all, Sentry or log stream. The response body is
    // unchanged; `loggedServerError` returns the same generic shape.
    return loggedServerError('mobile/businesses/[businessId]', error);
  }
}
