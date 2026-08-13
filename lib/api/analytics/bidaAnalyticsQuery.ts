import { createAnalyticsSupabaseClient } from '@/supabase/server';
import type {
  BidaAnalyticsPayload,
  BidaAnalyticsProduct,
} from '@/lib/types/bidaAnalytics';

/** The customer board's first page size — "on the board" means the owner's
 *  item appears where customers actually see it. Keep in sync with the
 *  mobile's POPULAR_PRODUCTS_PAGE_SIZE (ilokal-mobile services/popularProducts.ts). */
export const ON_BOARD_CUTOFF = 10;
/** How many daily snapshot counts a product's sparkline spans. */
export const SPARK_DAYS = 14;

type ProductRow = {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  is_available: boolean;
  weekly_view_count: number | null;
};

type HistoryRow = {
  product_id: string;
  snapshot_date: string;
  weekly_view_count: number;
  trend_score: number;
  global_rank: number | null;
};

type BusinessRow = {
  id: string;
  shop_name: string;
  logo_url: string | null;
};

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dateStr(d);
}

function throwOnError(
  res: { error: { message: string } | null },
  label: string,
): void {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
}

/**
 * The Bida Ngayon analytics payload for one business — the owner's own items
 * with their weekly views, deltas, catalog rank, and (for the single board
 * contender) the GLOBAL rank — read from `view_count_history` (the nightly
 * snapshot) + the live `products.weekly_view_count`. No competitor data is
 * ever fetched; ranks are positions, not names.
 */
export async function getBidaAnalytics(
  businessId: string,
): Promise<BidaAnalyticsPayload> {
  const supabase = await createAnalyticsSupabaseClient();

  const today = dateStr(new Date());
  const windowStart = addDays(today, -6);
  const lastWeekStart = addDays(today, -13);
  const weekAgo = addDays(today, -7);

  const [businessRes, productsRes, historyRes] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, shop_name, logo_url')
      .eq('id', businessId)
      .single(),
    supabase
      .from('products')
      .select('id, name, price, image_url, is_available, weekly_view_count')
      .eq('business_id', businessId)
      .is('archived_at', null),
    supabase
      .from('view_count_history')
      .select(
        'product_id, snapshot_date, weekly_view_count, trend_score, global_rank',
      )
      .eq('business_id', businessId)
      .gte('snapshot_date', lastWeekStart),
  ]);

  throwOnError(businessRes, 'getBidaAnalytics/business');
  throwOnError(productsRes, 'getBidaAnalytics/products');
  throwOnError(historyRes, 'getBidaAnalytics/history');

  const business = businessRes.data as BusinessRow;
  const products = (productsRes.data ?? []) as ProductRow[];
  const historyRows = (historyRes.data ?? []) as HistoryRow[];

  // Resolve raw storage paths to public URLs (seeds store paths; real
  // registrations may store either form) — same helper the /mobile routes use.
  const publicUrl = (bucket: string, path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };
  const logoUrl = publicUrl('shop-logos', business.logo_url);

  // product_id → snapshot_date → row
  const historyByProduct = new Map<string, Map<string, HistoryRow>>();
  for (const h of historyRows) {
    let byDate = historyByProduct.get(h.product_id);
    if (!byDate) {
      byDate = new Map();
      historyByProduct.set(h.product_id, byDate);
    }
    byDate.set(h.snapshot_date, h);
  }

  // This week's (windowStart..today) best rank for a product's map — the
  // business's best rank is the min across products.
  const bestRankIn = (
    byDate: Map<string, HistoryRow>,
    from: string,
    to: string,
  ): number | null => {
    let best: number | null = null;
    for (const [date, row] of byDate) {
      if (date >= from && date <= to && row.global_rank != null) {
        best = best == null ? row.global_rank : Math.min(best, row.global_rank);
      }
    }
    return best;
  };

  const base: Array<BidaAnalyticsProduct & { _score: number }> = products.map(
    (p) => {
      const byDate =
        historyByProduct.get(p.id) ?? new Map<string, HistoryRow>();
      const imageUrl = publicUrl('product-images', p.image_url);
      const todayRow = byDate.get(today);
      const weekAgoRow = byDate.get(weekAgo);
      const weeklyViews = p.weekly_view_count ?? 0;

      return {
        product_id: p.id,
        product_name: p.name,
        image_url: imageUrl,
        price: p.price,
        is_available: p.is_available,
        weekly_views: weeklyViews,
        views_delta:
          weekAgoRow != null
            ? weeklyViews - weekAgoRow.weekly_view_count
            : null,
        // Filled below once the business-wide ordering is known.
        catalog_rank: 0,
        bida_rank: todayRow?.global_rank ?? null,
        bida_rank_delta:
          weekAgoRow?.global_rank != null && todayRow?.global_rank != null
            ? weekAgoRow.global_rank - todayRow.global_rank
            : null,
        in_bida_board:
          todayRow?.global_rank != null &&
          todayRow.global_rank <= ON_BOARD_CUTOFF,
        spark: Array.from(
          { length: SPARK_DAYS },
          (_, i) =>
            byDate.get(addDays(today, -(SPARK_DAYS - 1) + i))
              ?.weekly_view_count ?? null,
        ),
        // Catalog ordering: available items first, by trend score (the snapshot
        // is the authoritative score; fall back to the live count), then id.
        _score: todayRow?.trend_score ?? weeklyViews,
      };
    },
  );

  // Catalog rank — #N of the business's items, by score (available lead).
  base.sort(
    (a, b) =>
      Number(b.is_available) - Number(a.is_available) ||
      b._score - a._score ||
      a.product_id.localeCompare(b.product_id),
  );
  base.forEach((p, i) => {
    p.catalog_rank = i + 1;
  });

  const productsSorted = [...base].sort(
    (a, b) => b.weekly_views - a.weekly_views,
  );

  // Summary
  const totalWeeklyViews = base.reduce((sum, p) => sum + p.weekly_views, 0);
  const anyWeekAgo = base.some((p) => {
    const byDate = historyByProduct.get(p.product_id);
    return byDate?.has(weekAgo) ?? false;
  });
  const sumWeekAgo = base.reduce((sum, p) => {
    const row = historyByProduct.get(p.product_id)?.get(weekAgo);
    return sum + (row?.weekly_view_count ?? 0);
  }, 0);

  const thisWeekBest = (() => {
    let best: number | null = null;
    for (const p of base) {
      const r = bestRankIn(
        historyByProduct.get(p.product_id) ?? new Map(),
        windowStart,
        today,
      );
      if (r != null) best = best == null ? r : Math.min(best, r);
    }
    return best;
  })();
  const lastWeekBest = (() => {
    let best: number | null = null;
    for (const p of base) {
      const r = bestRankIn(
        historyByProduct.get(p.product_id) ?? new Map(),
        lastWeekStart,
        weekAgo,
      );
      if (r != null) best = best == null ? r : Math.min(best, r);
    }
    return best;
  })();

  return {
    business: {
      id: business.id,
      shop_name: business.shop_name,
      logo_url: logoUrl,
    },
    window: { start: windowStart, end: today },
    summary: {
      total_weekly_views: totalWeeklyViews,
      total_views_delta: anyWeekAgo ? totalWeeklyViews - sumWeekAgo : null,
      best_bida_rank: thisWeekBest,
      best_bida_rank_delta:
        thisWeekBest != null && lastWeekBest != null
          ? lastWeekBest - thisWeekBest
          : null,
      on_board: thisWeekBest != null && thisWeekBest <= ON_BOARD_CUTOFF,
    },
    products: productsSorted.map(({ _score, ...p }) => p),
  };
}
