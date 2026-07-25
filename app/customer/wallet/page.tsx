import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { getWalletRedemptions } from '@/lib/api/customer/customerQuery';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { ROUTES } from '@/config/routeConfig';
import { cn } from '@/lib/utils';
import { RedemptionCard } from './components/redemption-card';
import type { WalletFilter } from '@/lib/types';

export const metadata: Metadata = {
  title: 'My Wallet - iLokal',
  description: 'Your redeemed deals and coupons',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS: { value: WalletFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'expired', label: 'Expired' },
];

export default async function WalletPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect(ROUTES.AUTH.LOGIN);

  const filter: WalletFilter = TABS.some((t) => t.value === sp.filter)
    ? (sp.filter as WalletFilter)
    : 'active';
  const page = Math.max(
    1,
    parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1,
  );

  const result = await getWalletRedemptions(user.id, filter, page);
  const loadFailed = 'error' in result;
  const redemptions = loadFailed ? [] : result.redemptions;

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">My wallet</h1>
        <p className="text-muted-foreground text-sm">
          Redeemed deals and coupons — show the code at the store before the
          timer runs out.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-lg border p-1 sm:w-fit">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            asChild
            variant={filter === tab.value ? 'default' : 'ghost'}
            size="sm"
            className={cn(filter !== tab.value && 'text-muted-foreground')}
          >
            <Link
              href={
                tab.value === 'active'
                  ? ROUTES.CUSTOMER.WALLET
                  : `${ROUTES.CUSTOMER.WALLET}?filter=${tab.value}`
              }
            >
              {tab.label}
            </Link>
          </Button>
        ))}
      </div>

      {loadFailed ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-12 text-center text-sm">
          Couldn&apos;t load your wallet right now — please refresh to try
          again.
        </div>
      ) : redemptions.length === 0 ? (
        <div className="text-muted-foreground space-y-3 rounded-xl border border-dashed p-12 text-center text-sm">
          <p>
            {filter === 'active'
              ? 'No active deals in your wallet yet.'
              : `No ${filter} redemptions.`}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.EXPLORE.HOME}>Browse deals</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {redemptions.map((redemption) => (
              <RedemptionCard key={redemption.id} redemption={redemption} />
            ))}
          </div>
          <PaginationBar metadata={result.metadata} noun="redemption" />
        </>
      )}
    </div>
  );
}
