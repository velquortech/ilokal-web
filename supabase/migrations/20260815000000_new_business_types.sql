-- ============================================================
-- New shop verticals: Entertainment & Events, Health & Wellness,
-- Education & Learning, Home & Property Services
-- ------------------------------------------------------------
-- The four launch verticals beyond Tourism & Leisure (which stays
-- DISABLED until its booking flow ships — see 20260813000000).
-- Each is a distinct business model with real market volume and its
-- own offering vocabulary, so a shop can describe itself accurately
-- instead of filing under a nearest-match in Services.
--
-- What this migration does:
--   1. Creates the 4 business_types rows (active) with their
--      offering_profile (vocabulary, service-attribute fields,
--      allowed price types, default booking mode).
--   2. Extends `sync_business_type_id()` so a business registering
--      under one of the new types is seeded the right offering_mode.
--      ⚠️ Mirror the new CASE in lib/types/offering.ts
--      (`offeringModeForVerticalName`) — the wizard resolves the
--      vocabulary BEFORE the row exists, so the two must stay in
--      lockstep. Keyed on the NAME, like every other mapping.
--   3. Moves two pending Services categories to their natural home:
--      'Tutorial / Review Center' → Education & Learning and
--      'Medical / Dental Clinic' → Health & Wellness. Both are
--      created by 20260812130000 / 20260814000000, which ship in the
--      SAME apply (version order guarantees this migration runs
--      after them). The move is written as "UPDATE the Services row
--      if it exists, otherwise INSERT under the new vertical", so a
--      standalone apply still lands the category in the right place.
--   4. Adds the new shop categories under each new type.
--   5. Scopes one offering category (`categories`) to each new
--      vertical, so the catalogue picker offers its own rows instead
--      of only the global ones (category_scoping.test.sql requires
--      every vertical to have at least one own category).
--
-- Ordering requirement: on a database that has NOT yet applied
-- 20260812130000/20260814000000 (live today), the move-UPDATEs match
-- zero rows and the guarded INSERTs create the categories under the
-- new verticals — correct. The 12130000/14000000 rows must then
-- NEVER be applied afterwards, or the Services copies return (their
-- guards are per name+vertical and won't see the new home). Apply
-- this migration together with them (single `db push`), never after.
--
-- Rollback:
--   UPDATE business_categories SET business_type_id = (Services id)
--    WHERE name IN ('Tutorial / Review Center', 'Medical / Dental Clinic');
--   DELETE FROM business_categories WHERE business_type_id IN (the 4 new type ids);
--   DELETE FROM categories WHERE slug IN ('entertainment-events','health-medical','classes-training','home-services');
--   DELETE FROM business_types WHERE name IN ('Entertainment & Events','Health & Wellness','Education & Learning','Home & Property Services');
--   (restore sync_business_type_id() from 20260727000000)
-- ============================================================

-- ─────────────────────────── 1. the four types ──────────────────────────────
INSERT INTO public.business_types (name, description, icon)
VALUES
  ('Entertainment & Events',
   'Venues and businesses that host entertainment, recreation, and events — karaoke, arcades, billiards, function halls, and cinemas.',
   'Clapperboard'),
  ('Health & Wellness',
   'Clinics, labs, and wellness providers offering consultations, treatments, and care.',
   'HeartPulse'),
  ('Education & Learning',
   'Schools, tutors, and training centers offering classes and instruction.',
   'GraduationCap'),
  ('Home & Property Services',
   'Contractors and tradespeople providing repairs, installation, and property services.',
   'Hammer')
ON CONFLICT (name) DO NOTHING;

-- ─────────── 2. offering vocabulary per new vertical ────────────────────────
-- COALESCE so an admin edit on an existing environment is preserved (the same
-- pattern as the seed's block 1b and 20260727000001).
UPDATE public.business_types
   SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
     'products', jsonb_build_object(
       'singular', 'Item', 'plural', 'Items', 'catalogue', 'Shop'),
     'services', jsonb_build_object(
       'singular', 'Package', 'plural', 'Packages', 'catalogue', 'Packages'),
     'both', jsonb_build_object(
       'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Offerings'),
     'icon', 'Clapperboard',
     'fields', jsonb_build_array('duration_minutes', 'capacity', 'service_location'),
     'allowed_price_types', jsonb_build_array('fixed', 'from', 'per_hour', 'per_person', 'per_event', 'on_request'),
     'default_booking_mode', 'request'
   ))
 WHERE name = 'Entertainment & Events';

UPDATE public.business_types
   SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
     'products', jsonb_build_object(
       'singular', 'Item', 'plural', 'Items', 'catalogue', 'Shop'),
     'services', jsonb_build_object(
       'singular', 'Service', 'plural', 'Services', 'catalogue', 'Services'),
     'both', jsonb_build_object(
       'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Offerings'),
     'icon', 'HeartPulse',
     'fields', jsonb_build_array('duration_minutes', 'lead_time_minutes', 'service_location'),
     'allowed_price_types', jsonb_build_array('fixed', 'from', 'per_hour', 'per_person', 'on_request'),
     'default_booking_mode', 'timeslot'
   ))
 WHERE name = 'Health & Wellness';

UPDATE public.business_types
   SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
     'products', jsonb_build_object(
       'singular', 'Item', 'plural', 'Items', 'catalogue', 'Shop'),
     'services', jsonb_build_object(
       'singular', 'Class', 'plural', 'Classes', 'catalogue', 'Classes'),
     'both', jsonb_build_object(
       'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Offerings'),
     'icon', 'GraduationCap',
     'fields', jsonb_build_array('duration_minutes', 'lead_time_minutes', 'service_location'),
     'allowed_price_types', jsonb_build_array('fixed', 'from', 'per_person', 'on_request'),
     'default_booking_mode', 'request'
   ))
 WHERE name = 'Education & Learning';

UPDATE public.business_types
   SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
     'products', jsonb_build_object(
       'singular', 'Item', 'plural', 'Items', 'catalogue', 'Shop'),
     'services', jsonb_build_object(
       'singular', 'Service', 'plural', 'Services', 'catalogue', 'Service Menu'),
     'both', jsonb_build_object(
       'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Offerings'),
     'icon', 'Hammer',
     'fields', jsonb_build_array('duration_minutes', 'lead_time_minutes', 'service_location'),
     'allowed_price_types', jsonb_build_array('fixed', 'from', 'per_hour', 'on_request'),
     'default_booking_mode', 'inquiry'
   ))
 WHERE name = 'Home & Property Services';

-- ─────────── 3. extend the offering_mode trigger (mirror of lib/types/offering.ts) ──
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
  -- The one-time backfill below covers existing rows, but without this every
  -- business registered AFTER this migration would be stuck on the 'products'
  -- column default — a salon signing up post-merge would get retail vocabulary
  -- with no way to change it (there is no owner-facing control yet).
  --
  -- Deliberately not applied on UPDATE: once an owner (or admin) sets a mode,
  -- changing category must not silently overwrite their choice.
  IF TG_OP = 'INSERT' AND NEW.business_type_id IS NOT NULL THEN
    SELECT bt.name INTO v_type_name
      FROM public.business_types bt
     WHERE bt.id = NEW.business_type_id;

    NEW.offering_mode := CASE v_type_name
      WHEN 'Services'               THEN 'services'
      WHEN 'Tourism & Leisure'      THEN 'both'
      WHEN 'Entertainment & Events' THEN 'both'
      WHEN 'Health & Wellness'      THEN 'services'
      WHEN 'Education & Learning'   THEN 'services'
      WHEN 'Home & Property Services' THEN 'services'
      ELSE NEW.offering_mode
    END;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_business_type_id() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_businesses_sync_business_type ON public.businesses;
CREATE TRIGGER trg_businesses_sync_business_type
  BEFORE INSERT OR UPDATE OF category_id ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_business_type_id();

-- ENABLE ALWAYS, not the default origin-only mode: the seeds run under
-- `session_replication_role = replica` (to bypass the auth.users FK), which
-- SKIPS normal triggers. Without this every seeded business would land with
-- business_type_id = NULL after `make migrate-reset`. Same gotcha as
-- 20260727000000.
ALTER TABLE public.businesses
  ENABLE ALWAYS TRIGGER trg_businesses_sync_business_type;

-- ─────────── 4. move the two pending Services categories home ───────────────
-- Both ship in 20260812130000 (Tutorial) / 20260814000000 (Medical & Dental),
-- which must be applied BEFORE this migration. The UPDATE moves the row if it
-- exists (same apply); the guarded INSERT covers a standalone apply where the
-- source row never landed. A business referencing the Services row (none exist
-- today — these categories are brand new) keeps its reference through the
-- UPDATE; the INSERT guard double-checks both the new home and the old one so
-- the two statements can never produce a duplicate.
UPDATE public.business_categories bc
   SET business_type_id = t.id
  FROM public.business_types t
 WHERE t.name = 'Education & Learning'
   AND bc.name = 'Tutorial / Review Center'
   AND bc.business_type_id = (SELECT id FROM public.business_types WHERE name = 'Services')
   AND bc.deleted_at IS NULL;

INSERT INTO public.business_categories (business_type_id, name, description, image_url)
SELECT t.id, v.name, v.description, v.image_url
  FROM public.business_types t
  JOIN (VALUES
    ('Tutorial / Review Center',
     'Academic tutoring and review classes.',
     'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=1600&h=1200&fit=crop&auto=format')
  ) AS v(name, description, image_url) ON t.name = 'Education & Learning'
 WHERE NOT EXISTS (
   SELECT 1 FROM public.business_categories bc
    WHERE bc.name = v.name AND bc.business_type_id = t.id
 )
   AND NOT EXISTS (
   SELECT 1 FROM public.business_categories bc
    WHERE bc.name = v.name
      AND bc.business_type_id = (SELECT id FROM public.business_types WHERE name = 'Services')
      AND bc.deleted_at IS NULL
 );

UPDATE public.business_categories bc
   SET business_type_id = t.id
  FROM public.business_types t
 WHERE t.name = 'Health & Wellness'
   AND bc.name = 'Medical / Dental Clinic'
   AND bc.business_type_id = (SELECT id FROM public.business_types WHERE name = 'Services')
   AND bc.deleted_at IS NULL;

INSERT INTO public.business_categories (business_type_id, name, description, image_url)
SELECT t.id, v.name, v.description, v.image_url
  FROM public.business_types t
  JOIN (VALUES
    ('Medical / Dental Clinic',
     'General practice, dental, and specialist consultations.',
     'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=1600&h=1200&fit=crop&auto=format')
  ) AS v(name, description, image_url) ON t.name = 'Health & Wellness'
 WHERE NOT EXISTS (
   SELECT 1 FROM public.business_categories bc
    WHERE bc.name = v.name AND bc.business_type_id = t.id
 )
   AND NOT EXISTS (
   SELECT 1 FROM public.business_categories bc
    WHERE bc.name = v.name
      AND bc.business_type_id = (SELECT id FROM public.business_types WHERE name = 'Services')
      AND bc.deleted_at IS NULL
 );

-- ─────────── 5. the new shop categories ─────────────────────────────────────
-- Same rules as every taxonomy block since 20260805130000:
--   * image_url non-NULL — the registration step renders <Image src={imageURL}>
--     with no fallback.
--   * images.unsplash.com only — a host must be on imageRemotePatterns AND not
--     redirect off it (CSP re-checks every hop). All URLs below were fetched
--     as stored: 200, zero redirects.
--   * `h=1200` forces a 4:3 crop for the card's fixed-height top-crop.
--   * `business_categories.name` has no UNIQUE — idempotency is a per-row
--     guard keyed on (name, business_type_id).
INSERT INTO public.business_categories (business_type_id, name, description, image_url)
SELECT bt.id, v.name, v.description, v.image_url
FROM public.business_types bt
JOIN (VALUES
  -- ──────────────────────── Entertainment & Events ─────────────────────────
  ('Entertainment & Events', 'Karaoke / Videoke Bar',
   'Karaoke, videoke, and singing rooms for groups.',
   'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Entertainment & Events', 'Game Center / Arcade',
   'Arcade games, consoles, and gaming lounges.',
   'https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Entertainment & Events', 'Event Venue / Function Hall',
   'Venues for weddings, parties, and corporate events.',
   'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Entertainment & Events', 'Cinema / Theater',
   'Movie theaters and performance stages.',
   'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Entertainment & Events', 'Billiards / Recreation Hall',
   'Billiards, darts, and recreation halls.',
   'https://images.unsplash.com/photo-1529257414772-1960b7bea4eb?q=80&w=1600&h=1200&fit=crop&auto=format'),
  -- ─────────────────────────── Health & Wellness ───────────────────────────
  ('Health & Wellness', 'Veterinary Clinic',
   'Pet health checkups, vaccinations, and treatments.',
   'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Health & Wellness', 'Dental Clinic / Orthodontist',
   'Dental consultations, cleaning, and orthodontics.',
   'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Health & Wellness', 'Physical Therapy / Rehabilitation',
   'Rehab, physiotherapy, and mobility care.',
   'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Health & Wellness', 'Mental Health / Counseling',
   'Counseling, therapy, and mental wellness.',
   'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Health & Wellness', 'Wellness / Holistic Therapy',
   'Holistic and alternative wellness treatments.',
   'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Health & Wellness', 'Diagnostic / Medical Laboratory',
   'Lab tests, diagnostics, and medical imaging.',
   'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=1600&h=1200&fit=crop&auto=format'),
  -- ─────────────────────────── Education & Learning ────────────────────────
  ('Education & Learning', 'Music / Arts School',
   'Music, arts, and creative classes.',
   'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Education & Learning', 'Driving School',
   'Driver education and practical training.',
   'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Education & Learning', 'Language / Enrichment Classes',
   'Language and enrichment programs.',
   'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Education & Learning', 'Computer / IT Training',
   'Computer literacy and IT skills training.',
   'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Education & Learning', 'Daycare / Preschool',
   'Child care and early education.',
   'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=1600&h=1200&fit=crop&auto=format'),
  -- ──────────────────────── Home & Property Services ───────────────────────
  ('Home & Property Services', 'General Contractor / Renovation',
   'Construction, renovation, and fit-out services.',
   'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Home & Property Services', 'Plumbing / Electrical Services',
   'Plumbing, electrical, and utility work.',
   'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Home & Property Services', 'Aircon Repair / Installation',
   'Aircon cleaning, repair, and installation.',
   'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Home & Property Services', 'Landscaping / Lawn Care',
   'Gardens, lawns, and outdoor maintenance.',
   'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Home & Property Services', 'Security / CCTV Installation',
   'CCTV, alarms, and security systems.',
   'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1600&h=1200&fit=crop&auto=format')
) AS v(vertical, name, description, image_url)
  ON bt.name = v.vertical
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_categories existing
   WHERE existing.name = v.name
     AND existing.business_type_id = bt.id
);

-- ─────────── 6. one scoped offering category per new vertical ───────────────
-- The catalogue picker reads "my vertical OR global". Insert GLOBAL and pin in
-- the next step (fail-open), the same shape as 20260805120000.
INSERT INTO public.categories (name, slug, description) VALUES
  ('Entertainment & Events', 'entertainment-events', 'Venues, tickets, and entertainment'),
  ('Health & Medical',       'health-medical',       'Consultations, checkups, and treatments'),
  ('Classes & Training',     'classes-training',     'Lessons, classes, and skills training'),
  ('Home Services',          'home-services',        'Repairs, installation, and property services')
ON CONFLICT (slug) DO NOTHING;

-- ⚠️ On a FRESH database these match ZERO rows — business_types are created by
-- the SEED after migrations. Mirrored (COALESCE'd) in
-- supabase/seeds/business_categories.sql block 1a.
UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Entertainment & Events'
  AND c.slug = 'entertainment-events'
  AND c.business_type_id IS NULL;

UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Health & Wellness'
  AND c.slug = 'health-medical'
  AND c.business_type_id IS NULL;

UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Education & Learning'
  AND c.slug = 'classes-training'
  AND c.business_type_id IS NULL;

UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Home & Property Services'
  AND c.slug = 'home-services'
  AND c.business_type_id IS NULL;
