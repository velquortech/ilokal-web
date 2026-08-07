-- ============================================================
-- Service trades: pest control, water refilling station
-- ------------------------------------------------------------
-- Same gap as 20260805130000 (retail trades), two more trades: neither a pest
-- control operator nor a water refilling station could describe itself OR
-- categorize what it sells, because both are missing from BOTH taxonomies:
--
--   business_categories  the SHOP type, picked once at registration and stored
--                        on `businesses.category_id`. Services had 4 rows
--                        (Salon, Spa, Fitness, Repair Services), so a pest
--                        control operator registered as "Repair Services" —
--                        which is also how the explore filter groups it.
--   categories           the OFFERING type, picked per product. Nothing in
--                        Services covered fumigation/disinfection, and nothing
--                        in Retail covered drinking water.
--
-- VERTICAL PLACEMENT — the consequential decision here, because
-- `sync_business_type_id` seeds `businesses.offering_mode` from the vertical
-- name ON INSERT and there is no owner-facing control to change it after:
--
--   Pest Control Service   -> Services. Mode 'services', so the catalogue reads
--                             "Service Menu", the form offers duration/notice/
--                             location, and default_booking_mode is 'request' —
--                             which is what a quoted site visit actually is.
--   Water Refilling Station -> Retail. It is a "station" providing a refill,
--                             but what the owner lists is priced GOODS
--                             ("5-Gallon Round — ₱30", "Slim — ₱35"), so mode
--                             'products' and "Product Catalogue" are right.
--                             Filing it under Services would give it a service
--                             menu, a booking flow and per-hour pricing for
--                             something bought over a counter. Delivery, when
--                             they offer it, is one more priced line — it does
--                             not make the shop a service business.
--
-- Data-only: no table, column, policy or index change.
--
-- Rollback:
--   DELETE FROM public.categories
--    WHERE slug IN ('pest-control-sanitation', 'drinking-water-refills');
--   DELETE FROM public.business_categories
--    WHERE name IN ('Pest Control Service', 'Water Refilling Station');
-- Safe only while nothing references them — `businesses.category_id` and
-- `products.category_id` are both FKs. Check before deleting.
-- ============================================================

-- ─────────────── 1. offering categories (Add Product picker) ────────────────
-- Inserted GLOBAL and pinned in step 2, so a vertical that fails to resolve
-- leaves the category visible everywhere rather than nowhere — the fail-open
-- shape 20260801064656 established.
INSERT INTO public.categories (name, slug, description) VALUES
  ('Pest Control & Sanitation', 'pest-control-sanitation', 'Pest control, termite treatment, fumigation, disinfection, and sanitation'),
  ('Drinking Water & Refills',  'drinking-water-refills',  'Purified and mineral drinking water, container refills, and delivery')
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────── 2. pin them to their vertical ───────────────────────
-- ⚠️ Matches ZERO rows on a fresh database — `business_types` are created by
-- the SEED, which runs AFTER migrations. The same mapping is repeated
-- (COALESCE'd) in `supabase/seeds/business_categories.sql`. Do not delete one
-- copy believing the other covers it.
UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Services'
  AND c.slug = 'pest-control-sanitation'
  AND c.business_type_id IS NULL;

UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Retail'
  AND c.slug = 'drinking-water-refills'
  AND c.business_type_id IS NULL;

-- ─────────────── 3. shop types (registration category step) ─────────────────
-- The constraints are the same four spelled out in 20260805130000; read that
-- header before editing this block. In short:
--
-- (a) `business_categories` has NO UNIQUE on `name`, so `ON CONFLICT (name)` is
--     unavailable — idempotency is a per-row `WHERE NOT EXISTS`.
-- (b) The seed's per-vertical blocks are wrapped in
--     `IF NOT EXISTS (… WHERE business_type_id = <vertical>)`, so appending
--     rows THERE is a no-op on every database that has ever been seeded. These
--     rows come from here, mirrored into the seed as their own unguarded block.
-- (c) `image_url` is nullable in the schema but the registration step renders
--     `<Image src={item.imageURL} />` with no fallback and types it `string` —
--     a NULL CRASHES the step. Both rows carry an image.
-- (d) `images.unsplash.com` only. A host must be on `imageRemotePatterns` AND
--     must not REDIRECT off it, because CSP re-checks every hop (picsum is
--     allowlisted and 302s to fastly.picsum.photos, which is not — six tiles
--     shipped broken that way, dev-only). Both URLs below were fetched as
--     stored: 200, zero redirects.
--
-- `h=1200` forces a 4:3 crop at the CDN: the card renders into a fixed
-- `h-36`/`h-52` box with no `object-cover`, so it TOP-CROPS and a portrait
-- source would show only its ceiling.
--
-- Chosen by eye at card size, not by alt text, and to match the fourteen
-- existing tiles: a real scene, no legible brand name (a named chain on a
-- category tile implies an affiliation that does not exist), no flat-lay
-- product shot. The obvious water search results were all rejected for exactly
-- that — the best-composed row of blue 5-gallon jugs has a legible "OASIS"
-- carton in frame, and the next has "co-op" across the label.
INSERT INTO public.business_categories (business_type_id, name, description, image_url)
SELECT bt.id, v.name, v.description, v.image_url
FROM public.business_types bt
JOIN (VALUES
  ('Services', 'Pest Control Service',
   'Pest control, termite treatment, fumigation, and disinfection for homes and businesses.',
   'https://images.unsplash.com/photo-1742483359033-13315b247c74?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Water Refilling Station',
   'Purified and mineral drinking water by the container, with refills and delivery.',
   'https://images.unsplash.com/photo-1752910210936-409d5f700b6f?q=80&w=1600&h=1200&fit=crop&auto=format')
) AS v(vertical, name, description, image_url)
  ON bt.name = v.vertical
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_categories existing
   WHERE existing.name = v.name
);
