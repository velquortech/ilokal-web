-- Freshness tiers for the mobile "New on the board" rail + spotlight NEW tier.
--
-- WHY: `is_new` means "created within the last 7 days" — business-level
-- (20260811000000) and, since 20260814120000, product-level too (a launch-week
-- product at an established business also qualifies). The seeds insert every
-- business AND every product with created_at = NOW(), so on a fresh local DB
-- ALL 61 businesses and ALL 521 products badge as NEW — a tier that matches
-- everything reads as noise (the same reason the client drops the badge on
-- its generic fallback).
--
-- This re-stamps a curated keep-list (so the tiers demo deterministically)
-- and backdates everything else:
--   * 5 fresh businesses (one per category) stamped 3 days ago — still within
--     the 7-day window, so the rail demos with variety;
--   * 2 launch-week products at ESTABLISHED (40-day-old) businesses stamped
--     1 HOUR ago — the newest ARRIVALS, so they lead the rail's ordering
--     (GREATEST of business/product created_at). One already ranks in the
--     grid top-8 (NEW chip there, excluded from the rail by the route's
--     dedup) and one is mid-board and ENTERS the rail — proving the widened
--     tier on both surfaces;
--   * everything else backdated 40 days.
--
-- Depends on: businesses.sql + products.sql. Idempotent — re-running
-- re-applies the same stamps.
--
-- Kept fresh — businesses (created ≤ 7 days):
--   11111111-…-101 The Artisan Roastery (Food & Beverage)
--   11111111-…-102 Flora & Flour Bakery   (Food & Beverage)
--   11111111-…-103 The Handy Corner       (Retail)
--   11111111-…-104 Aura Hair Studio       (Services)
--   11111111-…-114 Casa Ilongga B&B       (Tourism & Leisure)
--
-- Kept fresh — launch-week products at ESTABLISHED businesses:
--   33333333-…-357 Clothing Alteration   (FixRight Repair Hub — grid top-8)
--   33333333-…-366 Live Music Night Entry (The Lampara Live Music Bar — rail)

-- The 5 curated fresh businesses, stamped 3 days ago.
UPDATE public.businesses
SET created_at = NOW() - INTERVAL '3 days'
WHERE id IN (
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111103',
  '11111111-1111-1111-1111-111111111104',
  '11111111-1111-1111-1111-111111111114'
);

-- Their products, stamped 2 days ago (still launch-week).
UPDATE public.products
SET created_at = NOW() - INTERVAL '2 days'
WHERE business_id IN (
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111103',
  '11111111-1111-1111-1111-111111111104',
  '11111111-1111-1111-1111-111111111114'
);

-- The 2 launch-week products at established businesses — the newest arrivals.
UPDATE public.products
SET created_at = NOW() - INTERVAL '1 hour'
WHERE id IN (
  '33333333-3333-3333-3333-333333333357',
  '33333333-3333-3333-3333-333333333366'
);

-- Everything else backdated 40 days (businesses and products alike).
UPDATE public.businesses
SET created_at = NOW() - INTERVAL '40 days'
WHERE id NOT IN (
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111103',
  '11111111-1111-1111-1111-111111111104',
  '11111111-1111-1111-1111-111111111114'
);

UPDATE public.products
SET created_at = NOW() - INTERVAL '40 days'
WHERE business_id NOT IN (
  '11111111-1111-1111-1111-111111111101',
  '11111111-1111-1111-1111-111111111102',
  '11111111-1111-1111-1111-111111111103',
  '11111111-1111-1111-1111-111111111104',
  '11111111-1111-1111-1111-111111111114'
)
  AND id NOT IN (
    '33333333-3333-3333-3333-333333333357',
    '33333333-3333-3333-3333-333333333366'
  );
