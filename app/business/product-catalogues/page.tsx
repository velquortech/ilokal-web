import {
  getCategoriesAction,
  getBusinessProductsPaginatedAction,
  getBusinessProductStatsAction,
} from '../actions/productActions';
import { ProductCataloguesContent } from './components/product-catalogues-content';
import type { ProductFilters, ProductStatus } from '@/lib/types';

type SearchParams = Promise<{
  page?: string;
  perPage?: string;
  search?: string;
  category?: string;
  status?: string;
}>;

export default async function ProductCataloguesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const perPage = Math.min(
    50,
    Math.max(5, parseInt(params.perPage ?? '10', 10) || 10),
  );
  const search = params.search?.trim() || undefined;
  const category = params.category || undefined;
  const status = (params.status as ProductStatus) || undefined;

  const filters: Omit<ProductFilters, 'business_id'> = {
    page,
    per_page: perPage,
    search,
    category_id: category,
    status,
  };

  const [productsResult, categoriesResult, statsResult] = await Promise.all([
    getBusinessProductsPaginatedAction(filters),
    getCategoriesAction(),
    getBusinessProductStatsAction(),
  ]);

  const paginatedData = productsResult.success
    ? productsResult.data!
    : { products: [], total: 0, page: 1, per_page: perPage, total_pages: 0 };

  const categories = categoriesResult.success
    ? (categoriesResult.data ?? [])
    : [];

  const stats = statsResult.success
    ? statsResult.data!
    : { total: 0, active: 0, inactive: 0, archived: 0 };

  return (
    <ProductCataloguesContent
      products={paginatedData.products}
      metadata={{
        total: paginatedData.total,
        page: paginatedData.page,
        per_page: paginatedData.per_page,
        total_pages: paginatedData.total_pages,
      }}
      categories={categories}
      stats={stats}
    />
  );
}
