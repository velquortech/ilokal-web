import {
  getRedeemedCouponsAction,
  getRedemptionSummaryStatsAction,
} from '../actions/couponActions';
import { RedeemedCouponsContent } from './components/redeemed-coupons-content';
import type { RedemptionRecordFilters, RedemptionStatus } from '@/lib/types';

type SearchParams = Promise<{
  page?: string;
  perPage?: string;
  search?: string;
  status?: string;
  branch?: string;
}>;

export default async function RedeemedCouponsPage({
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
  const status = (params.status as RedemptionStatus) || undefined;
  const branchId =
    typeof params.branch === 'string' && params.branch.length > 0
      ? params.branch
      : undefined;

  const filters: RedemptionRecordFilters = {
    page,
    per_page: perPage,
    search,
    status,
    branch_id: branchId,
  };

  const [redemptionsResult, statsResult] = await Promise.all([
    getRedeemedCouponsAction(filters),
    getRedemptionSummaryStatsAction(branchId),
  ]);

  const paginatedData = redemptionsResult.success
    ? redemptionsResult.data!
    : { redemptions: [], total: 0, page: 1, per_page: perPage, total_pages: 0 };

  const stats = statsResult.success
    ? statsResult.data!
    : { total: 0, unique_users: 0, active: 0, claimed: 0 };

  return (
    <RedeemedCouponsContent
      branchId={branchId}
      redemptions={paginatedData.redemptions}
      metadata={{
        total: paginatedData.total,
        page: paginatedData.page,
        per_page: paginatedData.per_page,
        total_pages: paginatedData.total_pages,
      }}
      stats={stats}
    />
  );
}
