import type { Metadata } from 'next';
import { BadgePercent, Zap } from 'lucide-react';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { getDealsFeed } from '@/lib/api/customer/customerQuery';
import { DealCard } from '../components/deal-card';

export const metadata: Metadata = {
  title: 'Deals & coupons',
  description: 'Live deals and coupons from local shops around Iloilo City.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DealsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(
    1,
    parseInt(typeof sp.page === 'string' ? sp.page : '1', 10) || 1,
  );

  const result = await getDealsFeed(page, 20);

  return (
    <div className="flex flex-1 flex-col space-y-8">
      <div className="flex flex-col">
        <h1 className="font-display text-[clamp(1.875rem,3vw,2.75rem)] leading-tight font-bold tracking-tight">
          Deals & coupons
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Every live offer from local shops — tap one to redeem it on the
          shop&apos;s page.
        </p>
      </div>

      {'error' in result ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-12 text-center text-sm">
          Couldn&apos;t load deals right now — please refresh to try again.
        </div>
      ) : !result.featured &&
        result.flash.length === 0 &&
        result.explore.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-12 text-center text-sm">
          No live deals right now — check back soon.
        </div>
      ) : (
        <>
          {result.featured && (
            <section className="space-y-3">
              <h2 className="font-display inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
                <BadgePercent className="text-primary h-5 w-5" />
                Featured
              </h2>
              <DealCard deal={result.featured} featured />
            </section>
          )}

          {result.flash.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Zap className="text-primary h-5 w-5" />
                Flash deals
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.flash.map((deal) => (
                  <DealCard key={deal.id} deal={deal} flash />
                ))}
              </div>
            </section>
          )}

          {result.explore.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-2xl font-bold tracking-tight">
                All deals
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.explore.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
              <PaginationBar
                metadata={{
                  total: result.explore_total,
                  page: result.explore_page,
                  per_page: result.explore_per_page,
                  total_pages: Math.ceil(
                    result.explore_total / (result.explore_per_page || 20),
                  ),
                }}
                noun="deal"
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
