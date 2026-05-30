import {
  getBusinessCouponsPaginatedAction,
  getBusinessCouponStatsAction,
} from '../actions/couponActions';
import { getBusinessProductsAction } from '../actions/productActions';
import { CouponsContent } from './components/coupons-content';
import type { CouponFilters, ProductResponse } from '@/lib/types';

type SearchParams = Promise<{
  page?: string;
  perPage?: string;
  search?: string;
  status?: string;
}>;

export default async function CouponsPage({
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
  const status = (params.status as CouponFilters['status']) || undefined;

  const filters: CouponFilters = { page, per_page: perPage, search, status };

  const [couponsResult, statsResult, productsResult] = await Promise.all([
    getBusinessCouponsPaginatedAction(filters),
    getBusinessCouponStatsAction(),
    getBusinessProductsAction(),
  ]);

  const paginatedData = couponsResult.success
    ? couponsResult.data!
    : { coupons: [], total: 0, page: 1, per_page: perPage, total_pages: 0 };

  const stats = statsResult.success
    ? statsResult.data!
    : { total: 0, published: 0, draft: 0 };

  const products: ProductResponse[] = productsResult.success
    ? (productsResult.data ?? [])
    : [];

  return (
    <CouponsContent
      coupons={paginatedData.coupons}
      metadata={{
        total: paginatedData.total,
        page: paginatedData.page,
        per_page: paginatedData.per_page,
        total_pages: paginatedData.total_pages,
      }}
      stats={stats}
      products={products}
    />
  );
}
