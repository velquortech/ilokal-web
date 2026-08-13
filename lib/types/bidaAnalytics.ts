/**
 * Bida Ngayon owner analytics — "your item's Bida Ngayon ranking this week"
 * (spec docs/superpowers/specs/2026-08-12-owner-bida-ngayon-analytics.md).
 *
 * Everything here is derived from view_count_history (the nightly snapshot)
 * + the live `products.weekly_view_count` — no competitor data ever leaves
 * the server: the payload carries only the owner's own products and their
 * GLOBAL positions in the ranking.
 */

export type BidaAnalyticsProduct = {
  product_id: string;
  product_name: string;
  /** Cover priority: product photo → business banner → business logo → null
   *  (the client falls back to a gray glyph). */
  image_url: string | null;
  price: number | null;
  is_available: boolean;
  /** Rolling-7-day count (the live column; the same number the board ranks). */
  weekly_views: number;
  /** This week − last week. Null = no history yet (first week). */
  views_delta: number | null;
  /** #N within this business, by trend score (available items lead). */
  catalog_rank: number;
  /** Global rank — non-null ONLY for the business's single highest-scoring
   *  available item (the feed's one-board-contender rule). Siblings are null. */
  bida_rank: number | null;
  /** Last week's rank − this week's rank. Positive = moved up. Null = no
   *  history / not the contender. */
  bida_rank_delta: number | null;
  /** bida_rank <= ON_BOARD_CUTOFF (the customer board's first page). */
  in_bida_board: boolean;
  /** Last 14 daily rolling-7-day counts, oldest → newest; null = no row that
   *  day (e.g. the item was unavailable). */
  spark: (number | null)[];
};

export type BidaAnalyticsPayload = {
  business: { id: string; shop_name: string; logo_url: string | null };
  /** The rolling-7-day window the headline covers (ISO dates). */
  window: { start: string; end: string };
  summary: {
    total_weekly_views: number;
    /** vs the previous 7-day window; null = no history yet. */
    total_views_delta: number | null;
    /** The business's best global rank within this window (null = never
     *  rankable — nothing available / no row). */
    best_bida_rank: number | null;
    /** + = up that many spots; null = no history. */
    best_bida_rank_delta: number | null;
    /** Any item on the customer board's first page. */
    on_board: boolean;
  };
  /** Sorted by weekly_views descending (spec §6). */
  products: BidaAnalyticsProduct[];
};
