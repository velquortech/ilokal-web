-- ============================================================
-- General fallback category for every ACTIVE business type
-- ------------------------------------------------------------
-- The registration step (and the Explore filter) offers only the specific
-- categories seeded per vertical. A shop that fits none of them — a comedy
-- club that is not a Karaoke bar, a rental outfit that is neither a bike shop
-- nor a car hire — currently has to file itself under a nearest-match
-- category, which mislabels the shop to shoppers and misleads the filter.
-- This adds one 'General' category per ACTIVE vertical as the honest
-- last resort: "everything we have not named yet", offered last in the grid.
--
--   business_categories  the SHOP type, picked once at registration and stored
--                        on `businesses.category_id`.
--
-- Tourism & Leisure is deliberately EXCLUDED, same as 20260812130000: the
-- vertical is disabled (is_active = false, booking flow on hold), so a
-- category there is invisible to every picker. When the vertical re-enables,
-- its General row can be added then.
--
-- Data-only: no table, column, policy or index change.
--
-- Rollback:
--   DELETE FROM public.business_categories
--    WHERE name = 'General';
-- Safe only while nothing references them — `businesses.category_id` is an FK.
-- Check before deleting.
-- ============================================================

-- Same constraints as 20260812130000; read that header before editing.
--
-- (a) `business_categories` has NO UNIQUE on `name`, so `ON CONFLICT (name)`
--     is unavailable — idempotency is a per-row `WHERE NOT EXISTS`.
-- (b) The seed's per-vertical blocks are wrapped in
--     `IF NOT EXISTS (… WHERE business_type_id = <vertical>)`, so appending
--     rows THERE is a no-op on every database that has ever been seeded. These
--     rows come from here, mirrored into the seed as their own composite-
--     guarded block (WHERE NOT EXISTS on name + vertical), so a re-seed cannot
--     duplicate them either.
-- (c) `image_url` is nullable in the schema but the registration step renders
--     `<Image src={item.imageURL} />` with no fallback and types it `string` —
--     a NULL CRASHES the step. Every row carries an image.
-- (d) `images.unsplash.com` only. A host must be on `imageRemotePatterns` AND
--     must not REDIRECT off it, because CSP re-checks every hop. The URL below
--     was fetched as stored: 200, zero redirects. `h=1200` forces the 4:3
--     crop the category cards top-crop into.
--
-- `is_active` is not set, so the default (true) applies — General must be
-- offered wherever its vertical is.
INSERT INTO public.business_categories (business_type_id, name, description, image_url)
SELECT bt.id, v.name, v.description, v.image_url
FROM public.business_types bt
JOIN (VALUES
  ('Food & Beverage', 'General',
   'Shops that fit none of the more specific food and drink categories.',
   'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'General',
   'Stores that fit none of the more specific retail categories.',
   'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'General',
   'Services that fit none of the more specific service categories.',
   'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Entertainment & Events', 'General',
   'Entertainment, events, and recreation venues that fit none of the more specific categories.',
   'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Health & Wellness', 'General',
   'Health and wellness providers that fit none of the more specific categories.',
   'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Education & Learning', 'General',
   'Learning providers that fit none of the more specific categories.',
   'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Home & Property Services', 'General',
   'Home and property services that fit none of the more specific categories.',
   'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format')
) AS v(vertical, name, description, image_url)
  ON bt.name = v.vertical
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_categories existing
   WHERE existing.name = v.name
     AND existing.business_type_id = bt.id
);
