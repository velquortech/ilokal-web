import { unstable_cache } from 'next/cache';
import { createBearerClient } from '@/supabase/bearer';
import { successResponse, loggedServerError } from '@/app/api/helpers/response';

// Public, near-static reference list (types + categories) — filtered to only
// the categories that actually HAVE businesses, so the mobile Explore filter
// never advertises a dead category. Cache the successful DB read in the Next
// data cache (5 min) instead of hitting PostgREST on every app launch.
// unstable_cache (not a route-level `revalidate`) keeps the route
// runtime-dynamic — so it is not prerendered at build time and a transient DB
// error is never cached. (P10)
//
// The filter lives here in the API (not on the client): `business_categories`
// is an INNER join, and inside it `businesses` is an inner join restricted to
// verified, unarchived rows — so a type appears only if at least one of its
// categories has a browseable business, and a category appears only if it has
// one. The join matches the Explore feed contract (`status='verified'`,
// `archived_at IS NULL`), so the reference list and the browse results always
// agree on what "has content" means. The count of businesses per category is
// not exposed — only their existence, via the inner join.
const getBusinessTypes = unstable_cache(
  async () => {
    const supabase = createBearerClient();
    const { data, error } = await supabase
      .from('business_types')
      .select(
        `
        id, name, description, icon,
        business_categories!inner(
          id, name, description, image_url,
          businesses!businesses_category_id_fkey!inner(id)
        )
      `,
      )
      .is('deleted_at', null)
      .filter('business_categories.deleted_at', 'is', null)
      .filter('business_categories.businesses.status', 'eq', 'verified')
      .filter('business_categories.businesses.archived_at', 'is', null)
      .order('name')
      .order('name', { referencedTable: 'business_categories' });
    // Throw on error so a transient failure is NOT written to the cache — only a
    // successful result is stored for the revalidate window.
    if (error) throw error;
    return data;
  },
  ['mobile-business-types'],
  { revalidate: 300 },
);

export async function GET() {
  try {
    const data = await getBusinessTypes();
    return successResponse({ business_types: data });
  } catch (error) {
    return loggedServerError(
      'mobile/business-types',
      error as { message?: string },
    );
  }
}
