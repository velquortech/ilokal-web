import { getBusinessesMissingMenu } from '@/lib/api/admin/menuFollowUpQuery';
import { getOwnersMissingBusiness } from '@/lib/api/admin/registrationFollowUpQuery';
import { getRegistrationSettings } from '@/lib/api/appSettings';
import { getRegistrationStepIds } from '@/app/business/registration/data/stepMeta';
import { MenuFollowUpStats } from './components/menu-follow-up-stats';
import { MenuFollowUpContent } from './components/menu-follow-up-content';
import { RegistrationFollowUpStats } from './components/registration-follow-up-stats';
import { RegistrationFollowUpContent } from './components/registration-follow-up-content';
import { FollowUpTabs, type FollowUpTab } from './components/follow-up-tabs';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  tab?: string;
  // Menu tab.
  page?: string;
  perPage?: string;
  search?: string;
  onlyNoPromo?: string;
  // Registration tab — prefixed so paging one table can't page the other.
  rPage?: string;
  rPerPage?: string;
  rSearch?: string;
  onlyStarted?: string;
}>;

/** Shared clamp for both tables: 1-based page, page size in [5, 50]. */
function parsePaging(pageRaw?: string, perPageRaw?: string) {
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(5, parseInt(perPageRaw ?? '10', 10) || 10),
  );
  return { page, pageSize };
}

/**
 * Admin owner follow-up — two cohorts that both need a nudge, on one page.
 *
 * **Incomplete registration:** accounts that signed up as a business owner and
 * never listed a shop. Measured 2026-08-22 at 49% of all owner accounts, and
 * until this shipped the product had no way to reach them at all.
 *
 * **Missing menu:** verified shops a shopper opens to an empty page.
 *
 * Deliberately tabs rather than a twelfth admin page: it is the same job
 * (email an owner who has stalled) with the same affordances — search, filter,
 * paginate, send one, send all — so a separate route would have duplicated the
 * shell and crowded the sidebar. See `.claude/REGISTRATION_FUNNEL.md` §5.
 *
 * Both datasets are fetched regardless of the active tab, in parallel: it keeps
 * the counts on both triggers honest (an admin should see the other cohort is
 * non-empty without clicking), and at admin scale — dozens of rows, indexed
 * RPCs — the second read is cheap. Each RPC returns ONE page with its totals
 * from a separate uncapped COUNT, so nothing is counted in Node.
 */
export default async function OwnerFollowUpPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const activeTab: FollowUpTab =
    params.tab === 'menu' ? 'menu' : 'registration';

  const menuPaging = parsePaging(params.page, params.perPage);
  const menuSearch = params.search?.trim() || undefined;
  const onlyNoPromo = params.onlyNoPromo === '1';

  const regPaging = parsePaging(params.rPage, params.rPerPage);
  const regSearch = params.rSearch?.trim() || undefined;
  const onlyStarted = params.onlyStarted === '1';

  const [menu, registration, settings] = await Promise.all([
    getBusinessesMissingMenu({
      search: menuSearch,
      onlyNoPromo,
      page: menuPaging.page,
      pageSize: menuPaging.pageSize,
    }),
    getOwnersMissingBusiness({
      search: regSearch,
      onlyStarted,
      page: regPaging.page,
      pageSize: regPaging.pageSize,
    }),
    // The wizard's length is flag-driven (the Documents step is gated), so
    // "step 4 of 6" is read from the same source the wizard builds itself from
    // rather than hardcoded here.
    getRegistrationSettings(),
  ]);

  const totalSteps = getRegistrationStepIds(
    settings.requireBusinessDocuments,
  ).length;

  const menuTotalPages = Math.max(
    1,
    Math.ceil(menu.total / menuPaging.pageSize),
  );
  const regTotalPages = Math.max(
    1,
    Math.ceil(registration.total / regPaging.pageSize),
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Owner Follow-up</h1>
        <p className="text-muted-foreground mt-2">
          Owners who stalled — accounts that never listed a shop, and listed
          shops with nothing in them. Send each one a reminder.
        </p>
      </div>

      <FollowUpTabs
        active={activeTab}
        registrationCount={registration.failed ? 0 : registration.total}
        menuCount={menu.failed ? 0 : menu.total}
        registrationPanel={
          <>
            <RegistrationFollowUpStats
              total={registration.total}
              started={registration.started}
              reminded={registration.reminded}
              failed={registration.failed}
            />
            <RegistrationFollowUpContent
              rows={registration.rows}
              total={registration.total}
              failed={registration.failed}
              page={Math.min(regPaging.page, regTotalPages)}
              pageSize={regPaging.pageSize}
              totalPages={regTotalPages}
              search={regSearch ?? ''}
              onlyStarted={onlyStarted}
              totalSteps={totalSteps}
            />
          </>
        }
        menuPanel={
          <>
            <MenuFollowUpStats
              total={menu.total}
              noPromo={menu.noPromo}
              reminded={menu.reminded}
              failed={menu.failed}
            />
            <MenuFollowUpContent
              rows={menu.rows}
              total={menu.total}
              failed={menu.failed}
              page={Math.min(menuPaging.page, menuTotalPages)}
              pageSize={menuPaging.pageSize}
              totalPages={menuTotalPages}
              search={menuSearch ?? ''}
              onlyNoPromo={onlyNoPromo}
            />
          </>
        }
      />
    </div>
  );
}
