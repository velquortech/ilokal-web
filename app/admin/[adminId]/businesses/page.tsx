import {
  getBusinessesAction,
  getBusinessCountsAction,
} from '../actions/businessActions';
import { BusinessDocumentsContent } from './components/business-documents-content';
import { BusinessDocumentStats } from './components/business-document-stats';
import type { AdminBusinessWithMeta } from '@/lib/types/business';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  page?: string;
  perPage?: string;
  search?: string;
  status?: string;
}>;

/**
 * Admin business-document review. Lists businesses (searchable, status-filterable,
 * paginated) and lets an admin examine submitted documents, then approve or
 * disapprove (with remarks) via a row action menu — each decision notifies the
 * business owner.
 */
export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(5, parseInt(params.perPage ?? '10', 10) || 10),
  );
  const search = params.search?.trim() || undefined;
  const status = params.status?.trim() || undefined;

  const filters: Record<string, string | number> = { page, pageSize };
  if (search) filters.search = search;
  if (status) filters.status = status;

  const [result, countsResult] = await Promise.all([
    getBusinessesAction(filters),
    getBusinessCountsAction(),
  ]);
  const hasData = 'data' in result;

  const counts =
    'counts' in countsResult
      ? countsResult.counts
      : ({} as Record<string, number>);

  const businesses: AdminBusinessWithMeta[] = hasData ? result.data : [];
  const metadata = hasData
    ? {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      }
    : { total: 0, page, pageSize, totalPages: 0 };

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Business Documents
        </h1>
        <p className="text-muted-foreground mt-2">
          Review submitted documents and approve or disapprove business
          verification. Owners are notified of every decision.
        </p>
      </div>
      <BusinessDocumentStats counts={counts} />
      <BusinessDocumentsContent businesses={businesses} metadata={metadata} />
    </div>
  );
}
