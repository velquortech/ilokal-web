-- ============================================================
-- Sports & Recreation — a ninth vertical, assembled from four
-- trades that were scattered across three others
-- ------------------------------------------------------------
-- A gym, a badminton court, a billiards hall and a computer shop are one
-- industry to a shopper and were five unrelated rows to this schema: gyms
-- and computer shops under Services, billiards and arcades under
-- Entertainment & Events, gear under Retail, and court rental nowhere at
-- all. Explore's category filter groups by vertical, so the trade was
-- unfindable as a group.
--
-- RISK: HIGH. This is not a data-only seed like 20260807000000 — it
-- re-pins LIVE taxonomy rows, backfills a denormalized column on real
-- businesses, and replaces a trigger function. Applied to LOCAL only;
-- cloud apply needs human approval per the Workflow section of CLAUDE.md.
--
-- Measured against a LIVE SNAPSHOT (make pull-live), not against the seeds —
-- the seeded database is much smaller and does not even contain
-- 'Computer / Internet Shop'. On production:
--   • 2 businesses sit on the five moved shop types, both `verified`
--     (a martial-arts gym and an iCafe)
--   • their offering_mode is MIXED — 'services' and 'products' — and each is
--     correct for its shop, which is why step 4 does not touch it
--   • between them they have 3 offerings, all on the GLOBAL 'Other'
--     category, so step 6 puts nothing out of scope
--   • global category/vertical divergence was 0 before this ran, so the
--     test's global assertion is meaningful rather than scoped
--
-- Rollback: the pre-change trigger body is saved verbatim at
-- supabase/reports/rollback_sync_business_type_id_20260826.sql. To undo the
-- taxonomy, re-pin the five shop types to their original verticals (Retail,
-- Services ×2, Entertainment & Events ×2), re-run step 4's backfill, re-pin
-- 'sports-outdoor' to Retail and 'fitness-classes' to Services, then delete
-- the new shop type, the General row, the four new categories and the
-- vertical.
-- ============================================================

-- ─── 1. the vertical ──────────────────────────────────────
--
-- is_active = true, deliberately unlike Tourism & Leisure (which ships
-- disabled pending its booking flow). These trades degrade honestly without
-- online booking: a court lists "Badminton Court — ₱250/hour" as a service
-- offering and takes the booking by phone.
--
-- The 'services' nouns are Session/Sessions rather than Service/Services
-- because the same word has to cover a court hour, a gym day-pass and PC
-- time — "Session" is the only one that reads correctly for all three.
--
-- ON CONFLICT DO NOTHING rather than DO UPDATE: `name` is UNIQUE, and a
-- re-run must not overwrite an admin's later edit to the profile.
INSERT INTO public.business_types (name, description, icon, is_active, offering_profile)
VALUES (
  'Sports & Recreation',
  'Gyms, courts and sports facilities, recreation halls, gaming cafés, and sports gear.',
  -- Looked up in `iconMap` (app/business/registration/api/fetchCategories.ts).
  -- An icon with no entry there silently falls back to Coffee.
  'Dumbbell',
  true,
  jsonb_build_object(
    'products', jsonb_build_object(
      'singular', 'Product', 'plural', 'Products',
      'catalogue', 'Product Catalogue', 'shopLabel', 'My Shop'),
    'services', jsonb_build_object(
      'singular', 'Session', 'plural', 'Sessions',
      'catalogue', 'Sessions & Rates', 'shopLabel', 'My Shop'),
    'both', jsonb_build_object(
      'singular', 'Offering', 'plural', 'Offerings',
      'catalogue', 'Offerings', 'shopLabel', 'My Shop'),
    'icon', 'Dumbbell',
    -- capacity = players per court; inventory_count = how many courts, which
    -- is what makes two bookings at the same hour representable.
    'fields', jsonb_build_array(
      'duration_minutes', 'capacity', 'inventory_count', 'lead_time_minutes'),
    -- per_hour is the load-bearing one: courts, gym passes and PC time are
    -- all priced by the hour, and without it none of them is expressible.
    'allowed_price_types', jsonb_build_array(
      'fixed', 'from', 'per_hour', 'per_day', 'per_person', 'on_request'),
    'default_booking_mode', 'request'
  )
)
ON CONFLICT (name) DO NOTHING;

-- ─── 2. the one net-new shop type ─────────────────────────
--
-- Court rental had nowhere to register: an owner had to pick
-- 'Fitness Studio / Gym' or a generic 'Rentals' row described as
-- "Cars, bikes, equipment, and gear for hire".
--
-- 🔴 There is deliberately NO eSports row here. An earlier draft added
-- 'eSports / Computer Gaming Café' on the grounds that the PH computer-shop
-- trade had no home — which is true of the SEED files and false of
-- production, where 'Computer / Internet Shop' already exists under Services
-- and carries a real business. That row is re-pinned in step 3 instead. The
-- seeds are not the taxonomy: live carries 93 shop types, well beyond what
-- the seeds create, so a "nothing covers this" claim has to be checked
-- against live data, not against supabase/seeds.
--
-- One court row, not one per sport: the sport is the OFFERING
-- ("Badminton Court — ₱250/hr"), not the shop type. Splitting it would
-- inflate the registration picker with near-identical cards.
--
-- Guard is composite (name + vertical), never name alone — business_categories
-- has NO unique index on name, and 'Rentals' already proves a name can
-- legitimately exist under two verticals.
--
-- Both images are non-NULL and on images.unsplash.com. Both matter:
-- ShopCategoryStep renders <Image src={item.imageURL}> with no fallback, so
-- a NULL throws and takes the registration step down; and an allowlisted
-- host is not sufficient on its own, because CSP re-checks every redirect
-- hop (picsum 302s to a host that is not allowlisted, which renders as alt
-- text in dev only). h=1200 forces the 4:3 crop the card top-crops into.
-- Both URLs were fetched as stored: 200, 0 redirects, image/jpeg.
INSERT INTO public.business_categories (business_type_id, name, description, image_url)
SELECT sports.id, v.name, v.description, v.image_url
FROM (SELECT id FROM public.business_types WHERE name = 'Sports & Recreation') AS sports
CROSS JOIN (VALUES
  ('Sports Court / Facility Rental',
   'Badminton, basketball, futsal, volleyball and tennis courts for hourly hire.',
   'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1600&h=1200&fit=crop&auto=format')
) AS v(name, description, image_url)
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_categories existing
   WHERE existing.name = v.name
     AND existing.business_type_id = sports.id
);

-- ─── 3. re-pin the four scattered shop types ──────────────
--
-- Matched on (name, CURRENT vertical) so a re-run is a no-op and so this
-- cannot capture a same-named row that legitimately belongs elsewhere.
-- 'Bike Shop' is deliberately NOT here: a bike shop's trade is goods, the
-- same shape as Auto Supply / Motor Parts, and it stays under Retail.
UPDATE public.business_categories bc
   SET business_type_id = (
         SELECT id FROM public.business_types WHERE name = 'Sports & Recreation')
  FROM public.business_types old
 WHERE old.id = bc.business_type_id
   AND (bc.name, old.name) IN (
     ('Sports / Outdoor Shop',        'Retail'),
     ('Fitness Studio / Gym',         'Services'),
     ('Billiards / Recreation Hall',  'Entertainment & Events'),
     ('Game Center / Arcade',         'Entertainment & Events'),
     -- The PH computer-shop trade, which already existed on production under
     -- Services. Adopted rather than duplicated: it has a real business behind
     -- it, so a parallel eSports card would fragment one trade across two
     -- verticals and make the owner guess which to pick.
     ('Computer / Internet Shop',     'Services')
   );

-- ─── 3b. normalise the one legacy image ───────────────────
--
-- 'Fitness Studio / Gym' came from the original 2026 seed and carries the old
-- URL shape: w=2340, no h=, plus dead ixlib/ixid tracking params. Its six new
-- siblings all use the current one (80 of the 96 shop-type images repo-wide),
-- so inside this vertical it was the only odd row.
--
-- Not cosmetic: without `h=`, what lands in the card is unpredictable. The
-- cards render into a fixed h-36/h-52 box with NO object-cover, so they
-- top-crop — `h=1200` is what forces the 4:3 crop and makes the result
-- predictable. Same photo, same 200/0-redirect fetch, re-checked as stored.
--
-- Scoped to this one row on purpose: the other 15 legacy URLs sit in verticals
-- this migration does not touch, and sweeping them is its own change.
UPDATE public.business_categories bc
   SET image_url = split_part(bc.image_url, '?', 1)
                   || '?q=80&w=1600&h=1200&fit=crop&auto=format'
  FROM public.business_types bt
 WHERE bt.id = bc.business_type_id
   AND bt.name = 'Sports & Recreation'
   AND bc.image_url LIKE 'https://images.unsplash.com/%'
   AND split_part(bc.image_url, '?', 2) <> 'q=80&w=1600&h=1200&fit=crop&auto=format';

-- ─── 4. backfill the denormalized column ──────────────────
--
-- THE step that makes step 3 safe. businesses.business_type_id is
-- denormalized, and sync_business_type_id fires only on INSERT or on an
-- UPDATE OF category_id — neither of which a re-pin performs. Without this,
-- every shop already on a moved category keeps pointing at its OLD vertical
-- and getCategoryDivergence starts showing its owner a banner.
--
-- offering_mode is deliberately NOT written. The four affected shops hold a
-- mix of 'services' (the gyms) and 'both' (the arcade and billiards hall),
-- and each is right for that shop; the trigger is INSERT-only precisely so a
-- settled choice is never overwritten. Only category_id is untouched too, so
-- the sync trigger stays dormant here.
UPDATE public.businesses b
   SET business_type_id = bc.business_type_id
  FROM public.business_categories bc
 WHERE bc.id = b.category_id
   AND bc.business_type_id = (
         SELECT id FROM public.business_types WHERE name = 'Sports & Recreation')
   AND b.business_type_id IS DISTINCT FROM bc.business_type_id;

-- ─── 5. teach the trigger the new vertical ────────────────
--
-- Without an arm here, every shop registering under Sports & Recreation is
-- stuck on the 'products' column default — a court rental with a retail
-- Product Catalogue and no way to change it, since there is no owner-facing
-- control for offering_mode.
--
-- 'both' because the vertical genuinely holds each side: gear retail sells
-- products, gyms/courts/gaming sell time. Same call as Tourism & Leisure.
--
-- CREATE OR REPLACE, not DROP + CREATE: a drop leaves a window where every
-- INSERT on businesses fails, and it resets the function OWNER.
--
-- ⚠️ The body below was taken from `pg_get_functiondef` against the LIVE
-- database, NOT from 20260727000000 — four arms (Entertainment & Events,
-- Health & Wellness, Education & Learning, Home & Property Services) were
-- added by later migrations, and copying the original file would have
-- silently dropped them.
CREATE OR REPLACE FUNCTION public.sync_business_type_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_type_name TEXT;
BEGIN
  IF NEW.category_id IS NULL THEN
    NEW.business_type_id := NULL;
  ELSE
    SELECT bc.business_type_id INTO NEW.business_type_id
      FROM public.business_categories bc
     WHERE bc.id = NEW.category_id;
  END IF;

  -- Seed offering_mode from the vertical ON INSERT ONLY.
  --
  -- Deliberately not applied on UPDATE: once an owner (or admin) sets a mode,
  -- changing category must not silently overwrite their choice.
  IF TG_OP = 'INSERT' AND NEW.business_type_id IS NOT NULL THEN
    SELECT bt.name INTO v_type_name
      FROM public.business_types bt
     WHERE bt.id = NEW.business_type_id;

    -- ⚠️ Matched on the vertical NAME, which is admin-editable. Renaming a
    -- vertical listed here silently stops it stamping a mode.
    NEW.offering_mode := CASE v_type_name
      WHEN 'Services'                 THEN 'services'
      WHEN 'Tourism & Leisure'        THEN 'both'
      WHEN 'Entertainment & Events'   THEN 'both'
      WHEN 'Health & Wellness'        THEN 'services'
      WHEN 'Education & Learning'     THEN 'services'
      WHEN 'Home & Property Services' THEN 'services'
      WHEN 'Sports & Recreation'      THEN 'both'
      ELSE NEW.offering_mode
    END;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_business_type_id() FROM PUBLIC, anon, authenticated;

-- ─── 6. the offering-category picker ──────────────────────
--
-- The picker reads "my vertical OR global" (getCategoriesPaginated). A gym
-- moved out of Services would otherwise see only the 3 global categories —
-- and a picker with three entries is not a choice, it is a required field
-- with a default.
--
-- The two re-pinned rows are MOVED rather than duplicated. Verified against
-- the live database first: neither is referenced by a single product, so
-- moving them strands nothing.
UPDATE public.categories
   SET business_type_id = (
         SELECT id FROM public.business_types WHERE name = 'Sports & Recreation')
 WHERE slug IN ('sports-outdoor', 'fitness-classes')
   -- Guarded so a re-run reports 0 rows like every other step, rather than
   -- rewriting the same value and looking like it did work.
   AND business_type_id IS DISTINCT FROM (
         SELECT id FROM public.business_types WHERE name = 'Sports & Recreation');

-- The four new ones cover what the moved trades actually sell and the old
-- verticals had no word for. All kind='service': the goods side is already
-- carried by the re-pinned 'Sports & Outdoor'.
INSERT INTO public.categories (name, slug, kind, business_type_id)
SELECT v.name, v.slug, v.kind, sports.id
FROM (SELECT id FROM public.business_types WHERE name = 'Sports & Recreation') AS sports
CROSS JOIN (VALUES
  ('Court & Facility Time',  'court-facility-time', 'service'),
  ('Coaching & Lessons',     'coaching-lessons',    'service'),
  ('Gaming & Console Time',  'gaming-console-time', 'service'),
  ('Equipment Rental',       'equipment-rental',    'service')
) AS v(name, slug, kind)
ON CONFLICT (slug) DO NOTHING;

-- ─── 7. the General fallback row ──────────────────────────
--
-- 20260819010000 gives every ACTIVE vertical one 'General' shop type — the
-- honest last resort for a shop none of the specific cards describes. It
-- selected `WHERE bt.is_active = true` at the time it ran, so a vertical
-- added afterwards silently has none, and `general_categories.test.sql`
-- fails with "an active vertical does not have exactly one live General
-- category". Found by running that suite, not by reading the migration.
--
-- Same shared image and the same composite WHERE NOT EXISTS guard as the
-- rows it joins; `is_active` left to its default (true), since General must
-- be offered wherever its vertical is.
INSERT INTO public.business_categories (business_type_id, name, description, image_url)
SELECT bt.id,
       'General',
       'Sports, fitness, and recreation businesses that fit none of the more specific categories.',
       'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'
  FROM public.business_types bt
 WHERE bt.name = 'Sports & Recreation'
   AND NOT EXISTS (
     SELECT 1 FROM public.business_categories existing
      WHERE existing.name = 'General'
        AND existing.business_type_id = bt.id
   );
