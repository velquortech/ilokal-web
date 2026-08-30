import { getBusinessesMissingMenu } from '@/lib/api/admin/menuFollowUpQuery';
import { MenuFollowUpStats } from './components/menu-follow-up-stats';
import { MenuFollowUpContent } from './components/menu-follow-up-content';
import { PageHeader } from '@/components/custom/PageHeader';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  page?: string;
  perPage?: string;
  search?: string;
  onlyNoPromo?: string;
}>;

/**
 * Admin menu follow-up. Lists verified shops with no live offering (the ones a
 * shopper opens to an empty page) and lets an admin email each owner a reminder,
 * one at a time or all at once.
 *
 * The RPC returns the whole filtered set; pagination is sliced here rather than
 * pushed into the query, because the list is admin-scale (dozens, not
 * thousands) and "send to all" must act on the whole filtered set, not one page.
 */
export default async function MenuFollowUpPage({
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
  const onlyNoPromo = params.onlyNoPromo === '1';

  // The RPC returns ONE page; the totals are a separate uncapped COUNT. Nothing
  // is counted or sliced in Node, so the stats and "send to all" don't truncate
  // past PostgREST's 1000-row cap.
  const { rows, total, noPromo, reminded, failed } =
    await getBusinessesMissingMenu({ search, onlyNoPromo, page, pageSize });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex min-w-0 flex-1 flex-col space-y-6">
      <PageHeader
        title="Menu Follow-up"
        lede="Verified shops with no menu yet. Send the owner a reminder to add their listings — shoppers open these to an empty page."
      />

      <MenuFollowUpStats
        total={total}
        noPromo={noPromo}
        reminded={reminded}
        failed={failed}
      />

      <MenuFollowUpContent
        rows={rows}
        total={total}
        failed={failed}
        page={Math.min(page, totalPages)}
        pageSize={pageSize}
        totalPages={totalPages}
        search={search ?? ''}
        onlyNoPromo={onlyNoPromo}
      />
    </div>
  );
}
