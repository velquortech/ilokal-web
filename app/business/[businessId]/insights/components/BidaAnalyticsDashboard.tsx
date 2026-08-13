'use client';

import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Minus, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import type {
  BidaAnalyticsPayload,
  BidaAnalyticsProduct,
} from '@/lib/types/bidaAnalytics';
import { cn } from '@/lib/utils';

/**
 * The owner-facing "your item's Bida Ngayon ranking this week" surface
 * (spec docs/superpowers/specs/2026-08-12-owner-bida-ngayon-analytics.md §6).
 *
 * Design rules that must not drift:
 *  - weekly views lead, rank is contextual — the headline is the count, the
 *    board rank is framed around the one item that actually competes;
 *  - no fabricated urgency — deltas are null before history exists and render
 *    as "no comparison data yet", never as a fake ▲/▼;
 *  - the rank disc mirrors the customer board's BidaNgayonCard recipe so the
 *    two surfaces recognize each other.
 */

function DeltaChip({
  delta,
  suffix,
}: {
  delta: number | null;
  suffix: string;
}) {
  if (delta == null) {
    return (
      <span className="text-muted-foreground text-xs">
        no comparison data yet
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
        <TrendingUp aria-hidden className="h-3.5 w-3.5" />
        {delta.toLocaleString()} {suffix}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
        <TrendingDown aria-hidden className="h-3.5 w-3.5" />
        {Math.abs(delta).toLocaleString()} {suffix}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold">
      <Minus aria-hidden className="h-3.5 w-3.5" />
      flat
    </span>
  );
}

/** The customer board's rank disc recipe — dark translucent chip, on-scrim
 *  ink — so an owner's rank reads as the same number customers see. */
function RankDisc({ rank, size = 'md' }: { rank: number; size?: 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-black/40 font-bold text-white tabular-nums',
        size === 'lg' ? 'h-12 w-12 text-xl' : 'h-9 w-9 text-base',
      )}
      aria-label={`rank ${rank}`}
    >
      {rank}
    </span>
  );
}

function Sparkline({ values, id }: { values: (number | null)[]; id: string }) {
  if (values.every((v) => v == null)) {
    return (
      <span className="text-muted-foreground text-xs">no trend data yet</span>
    );
  }
  const data = values.map((v, i) => ({ i, v: v ?? 0 }));
  const gradId = `bida-spark-${id}`;
  return (
    <div className="h-10 w-32 shrink-0" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="var(--chart-1)"
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatPrice(price: number | null): string {
  return price == null ? '' : `₱${price.toLocaleString()}`;
}

function ProductRow({
  product,
  menuCount,
}: {
  product: BidaAnalyticsProduct;
  menuCount: number;
}) {
  const price = formatPrice(product.price);
  return (
    <li className="flex items-center gap-4 border-b py-4 last:border-b-0">
      {/* Thumbnail — product photo → gray glyph fallback. */}
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt=""
          className="bg-muted h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-sm">
          🛍️
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{product.product_name}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {price && <span className="mr-2">{price}</span>}
          <span className="text-muted-foreground/80">
            #{product.catalog_rank} of {menuCount} in your menu
          </span>
          {!product.is_available && (
            <span className="text-muted-foreground/60 ml-2">unavailable</span>
          )}
        </p>
      </div>

      <div className="hidden flex-col items-end sm:flex">
        <p className="text-xl font-bold tabular-nums">
          {product.weekly_views.toLocaleString()}
        </p>
        <DeltaChip delta={product.views_delta} suffix="vs last week" />
      </div>

      {/* The board contender carries the global rank disc — siblings get
          nothing here (the catalog rank above is their honest frame). */}
      {product.bida_rank != null && (
        <div className="flex shrink-0 flex-col items-center gap-1">
          <RankDisc rank={product.bida_rank} />
          <span className="text-muted-foreground text-[10px]">Bida Ngayon</span>
        </div>
      )}

      <Sparkline values={product.spark} id={product.product_id} />
    </li>
  );
}

export function BidaAnalyticsDashboard({
  data,
}: {
  data: BidaAnalyticsPayload;
}) {
  const { summary, products } = data;
  // The board contender — the one item with a global rank, best first.
  const contender = [...products]
    .filter((p) => p.bida_rank != null)
    .sort((a, b) => (a.bida_rank ?? 0) - (b.bida_rank ?? 0))[0];
  const anyViews = products.some((p) => p.weekly_views > 0);
  const allUnavailable =
    products.length > 0 && products.every((p) => !p.is_available);

  return (
    <div className="w-full space-y-6">
      {/* A. Headline — the only "stat" block. Weekly views lead; the rank is
          framed around the board moment, never shown bare. */}
      <section className="bg-card rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-muted-foreground text-sm">
              views this week · rolling 7 days
            </p>
            <p className="font-display mt-1 text-6xl leading-none font-bold tracking-tight tabular-nums">
              {summary.total_weekly_views.toLocaleString()}
            </p>
            <div className="mt-3">
              <DeltaChip
                delta={summary.total_views_delta}
                suffix="vs last week"
              />
            </div>
          </div>

          {summary.on_board && contender ? (
            <div className="dark:text-foreground flex items-center gap-4 rounded-xl bg-[#FEF8D6] px-5 py-4 text-[#1A1A1A] dark:bg-[#FEF8D6]/10">
              <Trophy aria-hidden className="h-6 w-6 shrink-0" />
              <div>
                <p className="text-sm">
                  Your{' '}
                  <span className="font-semibold">
                    {contender.product_name}
                  </span>{' '}
                  is
                </p>
                <p className="font-display text-2xl font-bold tracking-tight">
                  #{summary.best_bida_rank} on Bida Ngayon this week
                </p>
              </div>
              <RankDisc rank={summary.best_bida_rank!} size="lg" />
            </div>
          ) : summary.best_bida_rank != null ? (
            <div className="flex items-center gap-3 rounded-xl border px-5 py-4">
              <p className="text-muted-foreground text-sm">
                Best board rank this week
              </p>
              <RankDisc rank={summary.best_bida_rank} />
              {summary.best_bida_rank_delta != null &&
                summary.best_bida_rank_delta !== 0 && (
                  <DeltaChip
                    delta={summary.best_bida_rank_delta}
                    suffix="spots"
                  />
                )}
            </div>
          ) : null}
        </div>
      </section>

      {allUnavailable && (
        <div className="text-muted-foreground rounded-xl border border-dashed px-4 py-3 text-sm">
          Mark an item as available to compete for the board.
        </div>
      )}

      {/* B. Items — sorted by weekly views (the API sorts), each with its
          views, delta, catalog rank, the contender's global rank, and a
          14-day sparkline. */}
      {products.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No items yet — add your first item and it will appear here once it
          starts earning views.
        </div>
      ) : !anyViews ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No views yet — your items appear here once customers start opening
          them on ilokal.
        </div>
      ) : (
        <section className="bg-card rounded-2xl border">
          <div className="border-b px-6 py-4">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Your items this week
            </h2>
            <p className="text-muted-foreground text-xs">
              Ranked by weekly views · sparkline is the last 14 days
            </p>
          </div>
          <ul className="px-6">
            {products.map((p) => (
              <ProductRow
                key={p.product_id}
                product={p}
                menuCount={products.length}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
