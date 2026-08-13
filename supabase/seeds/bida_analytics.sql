-- Bida Ngayon owner analytics — demo history.
--
-- The analytics surface reads week-over-week deltas + 14-day sparklines from
-- view_count_history, but a freshly-seeded DB has no history yet (the nightly
-- snapshot only starts writing today's row). This seed backfills 14 days of
-- varied per-product history so the Insights tab demos with real-looking
-- trends, then runs the real snapshot for TODAY (feed-parity ranks from live
-- data).
--
-- Deterministic: each day's count = the product's current weekly_view_count
-- scaled by a rising day curve (oldest ≈ 55%, yesterday ≈ 94%) plus a small
-- per-product/day jitter (±10%, hashed on product+day) — so sparklines wiggle
-- believably and re-seeding reproduces the exact same history.
--
-- Depends on: businesses.sql + products.sql + ratings.sql + the bida_analytics
-- migration. Idempotent — history is derived data: cleared and rebuilt.

DELETE FROM public.view_count_history;

WITH days AS (
  -- 0 = yesterday … 13 = 13 days ago (today's row comes from the real
  -- snapshot at the end, with the live count + feed-parity rank).
  SELECT generate_series(0, 13) AS day_ago
),
eligible AS (
  SELECT p.id, p.business_id, p.weekly_view_count
  FROM public.products p
  JOIN public.businesses b ON b.id = p.business_id
  WHERE b.status = 'verified'
    AND b.archived_at IS NULL
    AND p.is_available = TRUE
    AND p.status = 'active'
    AND p.archived_at IS NULL
),
varied AS (
  SELECT
    e.id,
    e.business_id,
    d.day_ago,
    GREATEST(0, ROUND(
      COALESCE(e.weekly_view_count, 0)
        * (0.55 + 0.03 * (13 - d.day_ago))
        * (1 + ((abs(hashtext(e.id::text || ':' || d.day_ago)) % 21) - 10) / 100.0)
    )) AS day_count
  FROM eligible e
  CROSS JOIN days d
),
-- Per-day ranks with the feed's shape: one best product per business, then the
-- universe rank (siblings get no global_rank).
ranked AS (
  SELECT v.*,
    ROW_NUMBER() OVER (
      PARTITION BY v.business_id, v.day_ago
      ORDER BY v.day_count DESC, v.id ASC
    ) AS business_rn,
    ROW_NUMBER() OVER (
      PARTITION BY v.day_ago
      ORDER BY v.day_count DESC, v.id ASC
    ) AS universe_rn
  FROM varied v
)
INSERT INTO public.view_count_history (
  product_id, business_id, snapshot_date, weekly_view_count, trend_score, global_rank
)
SELECT
  r.id, r.business_id, (CURRENT_DATE - r.day_ago),
  r.day_count, r.day_count,
  CASE WHEN r.business_rn = 1 THEN r.universe_rn ELSE NULL END
FROM ranked r;

-- Today's real snapshot — live counts + the exact feed-parity ranks.
SELECT public.snapshot_weekly_view_history();
