-- ============================================================
-- Taxonomy on/off switch: `is_active`, Tourism disabled
-- ------------------------------------------------------------
-- `is_active` is the taxonomy's enable/disable flag, separate from
-- `deleted_at`. A disabled type/category is hidden from the public
-- pickers (registration, profile, mobile Explore reference) but stays
-- visible in admin reads, so it can be re-enabled the moment the
-- booking work lands — nothing has to be re-seeded or re-created.
--
-- Tourism & Leisure is the first tenant of the flag: its booking flow
-- (per-day/per-event pricing, capacity, deposits) is on hold, so the
-- whole vertical is marked inactive and hidden from every picker. Two
-- new shop types land at the same time — 'Tour / Travel Operator' and
-- 'Rentals' (general: cars, bikes, equipment, gear — not just vehicle
-- hire) — added disabled so the taxonomy is ready when the flow is.
--
-- Schema change + data, one migration: the columns, then the flip.
--
-- Rollback:
--   UPDATE public.business_types SET is_active = true
--    WHERE name = 'Tourism & Leisure';
--   UPDATE public.business_categories SET is_active = true
--    WHERE business_type_id = (SELECT id FROM public.business_types
--                              WHERE name = 'Tourism & Leisure');
--   DELETE FROM public.business_categories
--    WHERE name IN ('Tour / Travel Operator', 'Rentals');
--   ALTER TABLE public.business_categories DROP COLUMN is_active;
--   ALTER TABLE public.business_types DROP COLUMN is_active;
-- ============================================================

ALTER TABLE public.business_types
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.business_categories
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.business_types.is_active IS
  'False hides the type from public pickers (registration, Explore reference) without deleting it. Admin reads still show it.';
COMMENT ON COLUMN public.business_categories.is_active IS
  'False hides the category from public pickers without deleting it. Admin reads still show it.';

-- ─────────────────── flip Tourism & Leisure off ────────────────────────────
-- Matched on the admin-editable NAME like every other data migration.
-- Deliberately NOT COALESCE'd: Tourism is a hard feature gate until booking
-- ships, so a re-run must not resurrect it (the seed mirrors this for fresh
-- databases, where these UPDATEs match zero rows because the type/categories
-- are created by the seed AFTER migrations).
UPDATE public.business_types
   SET is_active = false
 WHERE name = 'Tourism & Leisure';

UPDATE public.business_categories
   SET is_active = false
 WHERE business_type_id = (
   SELECT id FROM public.business_types WHERE name = 'Tourism & Leisure'
 );

-- ─────────── the new shop types: Tour Operator + Rentals ───────────────────
-- 'Tour / Travel Operator' and 'Rentals' land under Tourism & Leisure, both
-- DISABLED (booking flow on hold); 'Rentals' also lands under Services,
-- ACTIVE — a car/equipment hire shop is a service business and Services is
-- not gated by the tourism hold.
--
-- ⚠️ Matches ZERO rows on a fresh database — business_types are created by
-- the SEED, which runs AFTER migrations. Mirrored into
-- `supabase/seeds/business_categories.sql` (block 8) for exactly that reason.
--
-- Guard keyed on name + vertical, NOT name alone: `business_categories` has no
-- UNIQUE on `name`, and 'Rentals' legitimately exists under TWO verticals — a
-- name-only `WHERE NOT EXISTS` would let the Services row skip because the
-- Tourism row already matches.
--
-- Image rules as 20260812130000 (non-NULL, images.unsplash.com, `h=1200`).
INSERT INTO public.business_categories (business_type_id, name, description, image_url, is_active)
SELECT bt.id, v.name, v.description, v.image_url, v.is_active
FROM public.business_types bt
JOIN (VALUES
  ('Tourism & Leisure', 'Tour / Travel Operator',
   'Guided tours, island hopping, and day excursions.',
   'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1600&h=1200&fit=crop&auto=format', false),
  ('Tourism & Leisure', 'Rentals',
   'Cars, bikes, equipment, and gear for hire.',
   'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1600&h=1200&fit=crop&auto=format', false),
  ('Services', 'Rentals',
   'Cars, bikes, equipment, and gear for hire.',
   'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1600&h=1200&fit=crop&auto=format', true)
) AS v(vertical, name, description, image_url, is_active)
  ON bt.name = v.vertical
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_categories existing
   WHERE existing.name = v.name
     AND existing.business_type_id = bt.id
);
