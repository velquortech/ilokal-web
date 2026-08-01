import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routeConfig';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import {
  getProductsPaginated,
  getProductStatsByBusinessId,
  getCategoriesPaginated,
} from '@/lib/api/products/productQuery';
import { getSectionsWithCounts } from '@/lib/api/sections/sectionQuery';
import { getBusinessTypeId } from '@/lib/api/offerings/offeringQuery';
import { ProductCataloguesContent } from './components/product-catalogues-content';
import type { ProductStatus } from '@/lib/types';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PRODUCT_STATUSES: ReadonlyArray<ProductStatus> = [
  'active',
  'unlisted',
  'disabled',
];

export default async function ProductCataloguesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [verify, sp] = await Promise.all([verifyBusinessOwner(), searchParams]);

  if (!verify.authorized) {
    const isUnauthenticated =
      verify.error &&
      typeof verify.error === 'object' &&
      'code' in verify.error &&
      (verify.error as { code: string }).code === 'AUTHENTICATION_ERROR';

    if (isUnauthenticated) redirect(ROUTES.AUTH.SIGN_IN);
  }

  const businessId = verify.business?.id;
  const branchId = typeof sp.branch === 'string' ? sp.branch : undefined;

  const page = Math.max(
    1,
    parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1,
  );
  const perPage = Math.min(
    50,
    Math.max(
      5,
      parseInt(typeof sp.perPage === 'string' ? sp.perPage : '10', 10) || 10,
    ),
  );
  const search = typeof sp.search === 'string' ? sp.search : undefined;
  const categoryId = typeof sp.category === 'string' ? sp.category : undefined;
  // '' (All) and 'none' (Uncategorised) are both meaningful; the query layer
  // maps 'none' to `section_id IS NULL`.
  const sectionId = typeof sp.section === 'string' ? sp.section : undefined;
  const status =
    typeof sp.status === 'string' &&
    PRODUCT_STATUSES.includes(sp.status as ProductStatus)
      ? (sp.status as ProductStatus)
      : ('' as const); // '' = all statuses (owner view); omitting would default to 'active'

  // The picker offers this vertical's categories plus the global ones, so a
  // salon is not asked to file a haircut under "Pastries". A null type (or a
  // failed read) falls back to every category — the pre-phase-5 behaviour.
  const businessTypeId = await getBusinessTypeId(businessId);

  const [productsResult, stats, categoriesResult, sectionsResult] =
    await Promise.all([
      businessId
        ? getProductsPaginated({
            business_id: businessId,
            branch_id: branchId,
            page,
            per_page: perPage,
            search,
            category_id: categoryId,
            section_id: sectionId,
            status,
          })
        : Promise.resolve({
            products: [],
            total: 0,
            page: 1,
            per_page: perPage,
            total_pages: 0,
          }),
      businessId
        ? getProductStatsByBusinessId(businessId, branchId)
        : Promise.resolve({
            total: 0,
            active: 0,
            unlisted: 0,
            disabled: 0,
            on_sale: 0,
          }),
      getCategoriesPaginated({
        page: 1,
        per_page: 100,
        business_type_id: businessTypeId,
      }),
      businessId
        ? getSectionsWithCounts(businessId)
        : Promise.resolve({ sections: [], uncategorised_count: 0 }),
    ]);

  const paginatedData =
    'error' in productsResult
      ? { products: [], total: 0, page: 1, per_page: perPage, total_pages: 0 }
      : productsResult;

  return (
    <ProductCataloguesContent
      products={paginatedData.products}
      metadata={{
        total: paginatedData.total,
        page: paginatedData.page,
        per_page: paginatedData.per_page,
        total_pages: paginatedData.total_pages,
      }}
      categories={categoriesResult.categories}
      stats={stats}
      businessId={businessId ?? ''}
      sections={sectionsResult.sections}
      uncategorisedCount={sectionsResult.uncategorised_count}
      sectionsFailed={'error' in sectionsResult && !!sectionsResult.error}
    />
  );
}
