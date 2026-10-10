-- Playtest fixture coupons: the named, realistic promo set the October mobile
-- playtest browsed against — SUMMER25 / LECHON50 / HILOT10 / COLDBREW30 /
-- HALO2X / PANSIT15 / INASAL20 / NAPOLEONES — recreated as durable seed rows.
--
-- Why this exists (and why it's NOT in coupons.sql): the Aug/Oct playtests ran
-- against hand-created Test-Cafe fixture rows that lived only in the live dev
-- DB. A `db reset` rebuilt the database from the seed files and those named
-- fixtures were gone — the curated feeds (flash/explore/featured) then showed
-- only procedural bulk "Limited-time deal N"/"Coupon offer N" copy instead of
-- the realistic named promos the app's realistic flows were tested against.
-- This file restores those shapes as seed-managed rows so a reset can't lose
-- them again.
--
-- Id-family contract (see refresh_freshness.sql): these live in the SAME
-- 44444444-… stable family the curated coupons.sql rows use, so
--   * refresh_freshness.sql re-dates them automatically when their windows
--     slide into the past on a kept-DB, and
--   * they are always insert-after-refresh-safe (ON CONFLICT DO NOTHING) under
--     re-seeding.
--
-- Windows are NOW()-relative and deliberately mimic the mock-up/playtest
-- shapes: an expiring-today flash deal (0–1 days), a 4h-style short window,
-- sold-out (near-cap) redemption counter, and mid-length explore rows.
--
-- Run order: after coupons.sql (needs businesses + the id family to exist),
-- before refresh_freshness.sql. Wired into Makefile seed-db + config.toml.

INSERT INTO public.coupons
  (id, business_id, code, description, discount, start_date, expiry_date, status,
   promotion_type, usage_scope, max_redemptions_global, current_redemptions)
VALUES
  -- Hidden Gem Coffee (The Artisan Roastery): flash + explore pair
  ('44444444-8000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111101',
   'COLDBREW30',
   '30% off every cold brew, all afternoon',
   '{"type":"percentage","value":30}',
   NOW(), NOW() + INTERVAL '4 hours',
   'published', 'deal', 'any', 20, 17),

  ('44444444-8000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111101',
   'SUMMER25',
   '25% off all iced drinks, dine-in only',
   '{"type":"percentage","value":25}',
   NOW(), NOW() + INTERVAL '2 days',
   'published', 'coupon', 'any', NULL, 0),

  -- Sweet Pinipig: the sold-out B1G1 (near-cap, but still published so the UI
  -- renders its "sold out" state from the counter, not a status filter)
  ('44444444-8000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111102',
   'HALO2X',
   'Free halo-halo upsize, 2pm–5pm only',
   '{"type":"percentage","value":50}',
   NOW(), NOW() + INTERVAL '8 hours',
   'published', 'deal', 'any', 10, 10),

  -- Carinderia ni Tatay: flash + explore pair
  ('44444444-8000-0000-0000-000000000004',
   '11111111-1111-1111-1111-111111111103',
   'PANSIT15',
   'Merienda platters for the whole barkada',
   '{"type":"percentage","value":15}',
   NOW(), NOW() + INTERVAL '1 day',
   'published', 'deal', 'any', NULL, 0),

  ('44444444-8000-0000-0000-000000000005',
   '11111111-1111-1111-1111-111111111103',
   'INASAL20',
   '20% off chicken inasal, every Friday',
   '{"type":"percentage","value":20}',
   NOW(), NOW() + INTERVAL '3 days',
   'published', 'deal', 'any', NULL, 0),

  -- Panaderia Antigua: explore pair (PIAYA3 keeps the "expiring days" rhythm;
  -- NAPOLEONES is the box-of-6 fixed peso deal)
  ('44444444-8000-0000-0000-000000000006',
   '11111111-1111-1111-1111-111111111104',
   'PIAYA3',
   '₱30 off a box of piaya, take-home size',
   '{"type":"fixed_amount","value":30}',
   NOW(), NOW() + INTERVAL '5 days',
   'published', 'deal', 'any', NULL, 0),

  ('44444444-8000-0000-0000-000000000007',
   '11111111-1111-1111-1111-111111111104',
   'NAPOLEONES',
   '₱60 off a Napoleones box of 6',
   '{"type":"fixed_amount","value":60}',
   NOW(), NOW() + INTERVAL '6 days',
   'published', 'deal', 'any', NULL, 0),

  -- Bacolod Wellness Spa: the pesos-off hilot coupon
  ('44444444-8000-0000-0000-000000000008',
   '11111111-1111-1111-1111-111111111105',
   'HILOT10',
   '₱100 off a 60-minute hilot massage',
   '{"type":"fixed_amount","value":100}',
   NOW(), NOW() + INTERVAL '9 days',
   'published', 'coupon', 'any', NULL, 0)

ON CONFLICT (id) DO NOTHING;
