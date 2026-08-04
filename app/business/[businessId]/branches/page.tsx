import {
  getBusinessBranchesAction,
  getBusinessBranchStatsAction,
} from '../actions/branchActions';
import { BranchesContent } from './components/branches-content';
import type { BranchFilters } from '@/lib/types';

type SearchParams = Promise<{
  page?: string;
  perPage?: string;
  search?: string;
  sort?: string;
}>;

type RouteParams = Promise<{ businessId: string }>;

export default async function BranchesPage({
  params: routeParams,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}) {
  // The route segment is the shop being viewed. Passing it on is what makes
  // this correct for an owner with more than one shop — without it the actions
  // fall back to whichever shop `.limit(1)` returns.
  const { businessId } = await routeParams;
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const perPage = Math.min(
    50,
    Math.max(5, parseInt(params.perPage ?? '10', 10) || 10),
  );
  const search = params.search?.trim() || undefined;
  const sort_by = (params.sort as BranchFilters['sort_by']) || 'name_asc';

  const filters: BranchFilters = {
    page,
    per_page: perPage,
    search,
    sort_by,
    status: 'all',
  };

  const [branchesResult, statsResult] = await Promise.all([
    getBusinessBranchesAction(businessId, filters),
    getBusinessBranchStatsAction(businessId),
  ]);

  const paginatedData = branchesResult.success
    ? branchesResult.data!
    : { branches: [], total: 0, page: 1, per_page: perPage, total_pages: 0 };

  const stats = statsResult.success
    ? statsResult.data!
    : { total: 0, with_location: 0, without_location: 0 };

  return (
    <BranchesContent
      branches={paginatedData.branches}
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
