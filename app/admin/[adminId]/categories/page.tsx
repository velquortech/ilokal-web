import { getCategoriesPaginated } from '@/lib/api/products/productQuery';
import { businessService } from '@/lib/api/business-categories/businessCategoriesService';
import { AdminCategoriesContent } from './components/admin-categories-content';
import { PageHeader } from '@/components/custom/PageHeader';

export const dynamic = 'force-dynamic';

/**
 * Admin offering-category management.
 *
 * The platform taxonomy shops filter by (`public.categories`). Admins create,
 * edit and delete categories here; `kind` scopes a category to products,
 * services, or both (NULL). The whole set is admin-scale (dozens of rows), so
 * the server fetches it in one call and the table paginates client-side.
 */
export default async function AdminCategoriesPage() {
  const result = await getCategoriesPaginated({
    page: 1,
    per_page: 200,
    sort_by: 'name_asc',
  });

  // The dialog's Business Type selector — every vertical, including disabled
  // ones (an admin may pin a category to a type whose flow is on hold).
  const { data: typeRows } = await businessService.getBusinessTypes();
  const businessTypes = (typeRows ?? []).map((t) => ({
    id: t.id,
    name: t.name,
  }));

  return (
    <div className="flex min-w-0 flex-1 flex-col space-y-6">
      <PageHeader
        title="Categories"
        lede="The offering taxonomy shoppers filter by. Kind scopes a category to products, services, or both — a service-only category never appears in a shop's product picker."
      />

      <AdminCategoriesContent
        categories={result.categories}
        businessTypes={businessTypes}
        loadFailed={'error' in result}
      />
    </div>
  );
}
