-- ============================================================
-- Taxonomy cleanup (audit findings)
-- ------------------------------------------------------------
-- Applies the shop-type audit (2026-08-13) to already-seeded
-- databases. Fresh databases get the same end-state directly from
-- `supabase/seeds/business_categories.sql` — the UPDATEs below match
-- ZERO rows there because migrations run BEFORE the seed creates the
-- rows. Keep both in sync.
--
-- What changes:
--   1. MERGE  'Sari-sari / Mini-Mart' into the neighborhood store row,
--      renamed to the local term 'Sari-sari / Convenience Store'.
--   2. MERGE  'Appliance Repair' into 'Repair Services' (appliances were
--      a strict subset); description widened to say so.
--   3. RENAME 'Fast Food / Food Cart' -> 'Fast Food'  (a food cart IS a
--      street food vendor — 'Street Food Vendor' stays the vendor row).
--   4. RENAME 'Clothing & Apparel' -> 'Clothing / Apparel',
--             'Sports & Outdoor Shop' -> 'Sports / Outdoor Shop'
--      — shop-type names standardize on the ' / ' separator.
--   5. RENAME 'Specialty Shop' -> 'Gift / Specialty Shop' — the generic
--      catch-all next to 20 specific retail rows is retired; souvenirs
--      and handicrafts already have their own row.
--   6. ADD    'Medical / Dental Clinic' (Services), 'Pet Grooming'
--      (Services), 'Fruit / Vegetable Stand' (Retail).
--
-- Data-only. Each merge REMAPS `businesses.category_id` off the dropped
-- row before deleting it (the column is an FK; check before deleting).
--
-- Rollback is manual: re-insert the two dropped rows, re-map businesses
-- back, and revert the renames. Safe only while nothing new references
-- the final names.
-- ============================================================

-- ──────────────────── 1. Sari-sari / Mini-Mart merge ───────────────────────
-- Rename the surviving row to the local term first, then remap the dropped
-- row's businesses onto it, then delete the dropped row.
UPDATE public.business_categories
   SET name = 'Sari-sari / Convenience Store',
       description = 'Neighborhood sari-sari and convenience stores selling daily essentials and fresh produce.'
 WHERE name = 'Local Grocery / Convenience Store';

UPDATE public.businesses b
   SET category_id = (
     SELECT id FROM public.business_categories
      WHERE name = 'Sari-sari / Convenience Store' LIMIT 1
   )
 WHERE category_id IN (
   SELECT id FROM public.business_categories WHERE name = 'Sari-sari / Mini-Mart'
 );

DELETE FROM public.business_categories WHERE name = 'Sari-sari / Mini-Mart';

-- ──────────────────── 2. Appliance Repair merge ────────────────────────────
UPDATE public.businesses b
   SET category_id = (
     SELECT id FROM public.business_categories
      WHERE name = 'Repair Services' LIMIT 1
   )
 WHERE category_id IN (
   SELECT id FROM public.business_categories WHERE name = 'Appliance Repair'
 );

DELETE FROM public.business_categories WHERE name = 'Appliance Repair';

UPDATE public.business_categories
   SET description = 'Electronics, appliance, tailoring, and general repair.'
 WHERE name = 'Repair Services';

-- ──────────────────── 3–5. renames ─────────────────────────────────────────
UPDATE public.business_categories SET name = 'Fast Food'
 WHERE name = 'Fast Food / Food Cart';

UPDATE public.business_categories SET name = 'Clothing / Apparel'
 WHERE name = 'Clothing & Apparel';

UPDATE public.business_categories SET name = 'Sports / Outdoor Shop'
 WHERE name = 'Sports & Outdoor Shop';

UPDATE public.business_categories
   SET name = 'Gift / Specialty Shop',
       description = 'Curated gifts, specialty items, and unique finds.'
 WHERE name = 'Specialty Shop';

-- ──────────────────── 6. high-value additions ──────────────────────────────
-- ⚠️ Matches ZERO rows on a fresh database (types don't exist until the seed
-- runs) — mirrored in `supabase/seeds/business_categories.sql` (block 10).
-- Composite WHERE NOT EXISTS (name + vertical) per the newer convention.
INSERT INTO public.business_categories (business_type_id, name, description, image_url)
SELECT bt.id, v.name, v.description, v.image_url
FROM public.business_types bt
JOIN (VALUES
  ('Services', 'Medical / Dental Clinic',
   'General practice, dental, and specialist consultations.',
   'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Pet Grooming',
   'Bathing, grooming, and care for pets.',
   'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Fruit / Vegetable Stand',
   'Fresh fruits, vegetables, and market produce.',
   'https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=1600&h=1200&fit=crop&auto=format')
) AS v(vertical, name, description, image_url)
  ON bt.name = v.vertical
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_categories existing
   WHERE existing.name = v.name
     AND existing.business_type_id = bt.id
);
