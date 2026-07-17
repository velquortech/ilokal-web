import { unstable_cache } from 'next/cache';
import { createBearerClient } from '@/supabase/bearer';
import { successResponse, loggedServerError } from '@/app/api/helpers/response';

// Public, near-static reference list (types + categories). Cache the successful DB
// read in the Next data cache (5 min) instead of hitting PostgREST on every app
// launch. unstable_cache (not a route-level `revalidate`) keeps the route
// runtime-dynamic — so it is not prerendered at build time and a transient DB
// error is never cached. (P10)
const getBusinessTypes = unstable_cache(
  async () => {
    const supabase = createBearerClient();
    const { data, error } = await supabase
      .from('business_types')
      .select(
        'id, name, description, icon, business_categories(id, name, description, image_url)',
      )
      .is('deleted_at', null)
      .is('business_categories.deleted_at', null)
      .order('name');
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
