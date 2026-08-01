import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BadgePercent, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { getDealsFeed, type FeedDeal } from '@/lib/api/customer/customerQuery';
import { explorePath } from '@/config/routeConfig';

export const metadata: Metadata = {
  title: 'Deals & coupons',
  description: 'Live deals and coupons from local shops around Iloilo City.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function discountLabel(discount: FeedDeal['discount']): string {
  if (!discount) return 'Deal';
  return discount.type === 'percentage'
    ? `${discount.value}% off`
    : `₱${discount.value} off`;
}

function DealRow({ deal, flash }: { deal: FeedDeal; flash?: boolean }) {
  return (
    <Link
      href={explorePath(deal.business_id)}
      className="bg-card hover:border-primary/40 flex items-center gap-3 rounded-xl border p-4 transition-colors"
    >
      <div className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-full border">
        {deal.business_logo_url && (
          <Image
            src={deal.business_logo_url}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{deal.description ?? deal.code}</p>
        <p className="text-muted-foreground truncate text-xs">
          {deal.business_name} · ends{' '}
          {new Date(deal.expiry_date).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
          })}
          {deal.slots_remaining != null && ` · ${deal.slots_remaining} left`}
        </p>
      </div>
      {flash && (
        <Badge className="shrink-0">
          <Zap className="h-3 w-3" />
          Flash
        </Badge>
      )}
      <span className="bg-primary/10 text-primary shrink-0 rounded-full px-3 py-1 text-sm font-bold">
        {discountLabel(deal.discount)}
      </span>
    </Link>
  );
}

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
        <h1 className="text-2xl font-bold tracking-tight">Deals & coupons</h1>
        <p className="text-muted-foreground text-sm">
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
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
                <BadgePercent className="text-primary h-5 w-5" />
                Featured
              </h2>
              <DealRow deal={result.featured} />
            </section>
          )}

          {result.flash.length > 0 && (
            <section className="space-y-3">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Zap className="text-primary h-5 w-5" />
                Flash deals
              </h2>
              <div className="space-y-3">
                {result.flash.map((deal) => (
                  <DealRow key={deal.id} deal={deal} flash />
                ))}
              </div>
            </section>
          )}

          {result.explore.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                All deals
              </h2>
              <div className="space-y-3">
                {result.explore.map((deal) => (
                  <DealRow key={deal.id} deal={deal} />
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
