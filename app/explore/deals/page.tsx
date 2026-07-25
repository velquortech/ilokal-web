import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BadgePercent, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PaginationBar } from '@/components/customer/PaginationBar';
import { createServerSupabaseClient } from '@/supabase/server';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { explorePath } from '@/config/routeConfig';
import type { PublicCoupon } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Deals & Coupons - iLokal',
  description: 'Live deals and coupons from local shops around Iloilo City.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface FeedDeal {
  id: string;
  code: string;
  description: string | null;
  discount: PublicCoupon['discount'];
  expiry_date: string;
  promotion_type: string;
  slots_remaining: number | null;
  business_id: string;
  business_name: string;
  business_logo_url: string | null;
}

interface DealsPayload {
  featured: FeedDeal | null;
  flash: FeedDeal[];
  explore: FeedDeal[];
  explore_total: number;
  explore_page: number;
  explore_per_page: number;
}

function discountLabel(discount: PublicCoupon['discount']): string {
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

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('mobile_deals', {
    p_category: 'All',
    p_search: '',
    p_page: page,
    p_per_page: 20,
  });

  if (error) console.error('[explore/deals]', error);

  const payload = (data ?? {
    featured: null,
    flash: [],
    explore: [],
    explore_total: 0,
    explore_page: 1,
    explore_per_page: 20,
  }) as unknown as DealsPayload;

  const resolve = (deal: FeedDeal): FeedDeal => ({
    ...deal,
    business_logo_url: resolveStorageUrl(
      supabase,
      'shop-logos',
      deal.business_logo_url,
    ),
  });

  const featured = payload.featured ? resolve(payload.featured) : null;
  const flash = (payload.flash ?? []).map(resolve);
  const explore = (payload.explore ?? []).map(resolve);

  const isEmpty = !featured && flash.length === 0 && explore.length === 0;

  return (
    <div className="flex flex-1 flex-col space-y-8">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight">Deals & coupons</h1>
        <p className="text-muted-foreground text-sm">
          Every live offer from local shops — tap one to redeem it on the
          shop&apos;s page.
        </p>
      </div>

      {isEmpty ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-12 text-center text-sm">
          No live deals right now — check back soon.
        </div>
      ) : (
        <>
          {featured && (
            <section className="space-y-3">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
                <BadgePercent className="text-primary h-5 w-5" />
                Featured
              </h2>
              <DealRow deal={featured} />
            </section>
          )}

          {flash.length > 0 && (
            <section className="space-y-3">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Zap className="text-primary h-5 w-5" />
                Flash deals
              </h2>
              <div className="space-y-3">
                {flash.map((deal) => (
                  <DealRow key={deal.id} deal={deal} flash />
                ))}
              </div>
            </section>
          )}

          {explore.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                All deals
              </h2>
              <div className="space-y-3">
                {explore.map((deal) => (
                  <DealRow key={deal.id} deal={deal} />
                ))}
              </div>
              <PaginationBar
                metadata={{
                  total: payload.explore_total,
                  page: payload.explore_page,
                  per_page: payload.explore_per_page,
                  total_pages: Math.ceil(
                    payload.explore_total / (payload.explore_per_page || 20),
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
