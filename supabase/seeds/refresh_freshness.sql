-- Seed freshness: re-date every demo coupon whose promo window has slid into
-- the past, relative to NOW(), so a dev DB seeded weeks ago still shows a live
-- Promos feed.
--
-- Why this exists: seed rows legitimately expire (coupons.sql's 30-day windows,
-- bulk_seed's published-30d variety matrix, dashboards created earlier that
-- month). A `db reset` re-dates them from scratch — but a dev DB kept running
-- from last month keeps the old dates, and the mobile /mobile/deals feed is
-- then empty with no error. This file is the "kept-DB" counterpart to a reset:
-- it slides any already-expired demo row's window into the future instead of
-- requiring a wipe.
--
-- Scope is deliberately narrow:
--   * only `published` rows (drafts/archived stay as-is; the API filters them
--     out anyway, so re-dating them would be cosmetic sandbox churn),
--   * only rows whose window has actually closed,
--   * an explicit id-prefix guard that covers BOTH id families — the
--     stable hand-crafted seed UUIDs (44444444-…) and the bulk-seed procedural
--     UUIDs (f2000000-…) — and nothing else. Real store data (hand-created
--     coupons on verifiable businesses) is never re-dated by this script, so it
--     can never paper over a genuinely expired real-world promo.
--
-- Idempotent: after running, every touched row is in the future, so re-running
-- until a row's new window passes again does exactly nothing.
--
-- Run order: LAST. Other seeds may create rows it then re-dates; also, the
-- real_world_gaps pass deliberately nulls some seed images and must not have
-- its work re-timed. Documented in README's run order alongside bulk_seed.

UPDATE public.coupons
SET start_date = NOW(),
    expiry_date = NOW() + INTERVAL '30 days'
WHERE status = 'published'
  AND expiry_date <= NOW()
  AND (
    id::text LIKE '44444444%'   -- curated coupons.sql rows
    OR id::text LIKE 'f2000000%' -- bulk_seed procedural rows
  );
