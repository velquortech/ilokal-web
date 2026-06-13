-- Dev seed: sample weekly view counts for businesses + products.
-- Depends on: businesses.sql, products.sql, and migration 20260607000001.
--
-- Populates the denormalized weekly_view_count columns so the mobile "Trending"
-- business badge and the product view badge show believable numbers. Values are
-- derived deterministically from each row's id (md5 → int), so re-running the
-- seed yields the same counts — no random drift.

-- Businesses: ~80–1600 weekly profile opens. All exceed the mobile Trending
-- threshold (10), so the badge lights up across the seed set.
UPDATE public.businesses
SET weekly_view_count =
  80 + (('x' || substr(md5(id::text), 1, 8))::bit(32)::bigint % 1520)::int;

-- Products: ~15–1500 weekly opens. The spread crosses 1,000 so the mobile
-- formatCount "1.2k" path is exercised too.
UPDATE public.products
SET weekly_view_count =
  15 + (('x' || substr(md5(id::text), 1, 8))::bit(32)::bigint % 1485)::int;
