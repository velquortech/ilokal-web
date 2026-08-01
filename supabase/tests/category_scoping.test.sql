-- Behavioral tests for migration 20260801064656 (category ↔ vertical mapping).
--
-- The claim: the picker's read is "my vertical OR global", so a wrong or
-- missing mapping degrades to visible-everywhere rather than a category
-- disappearing from every shop. These pin the mapping and, more importantly,
-- that nothing was orphaned.
--
-- Non-destructive: runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/category_scoping.test.sql
--
-- Expected tail: "ALL CATEGORY SCOPING TESTS PASSED".

BEGIN;

DO $$
DECLARE
  v_food    UUID;
  v_retail  UUID;
  v_type    UUID;
  v_count   INTEGER;
BEGIN
  SELECT id INTO v_food   FROM business_types WHERE name = 'Food & Beverage';
  SELECT id INTO v_retail FROM business_types WHERE name = 'Retail';
  ASSERT v_food IS NOT NULL AND v_retail IS NOT NULL,
    'fixtures missing: seed business_types first';

  -- ─────────────────────────── the mapping ────────────────────────────────
  SELECT business_type_id INTO v_type FROM categories WHERE slug = 'food-beverages';
  ASSERT v_type = v_food, 'Food & Beverages is not scoped to the F&B vertical';

  SELECT count(*) INTO v_count
    FROM categories
   WHERE slug IN ('clothing-apparel', 'electronics-gadgets', 'home-living')
     AND business_type_id = v_retail;
  ASSERT v_count = 3, 'the three retail categories are not scoped to Retail';

  -- Health & Beauty stays GLOBAL on purpose: it belongs to a salon's services
  -- and a pharmacy's shelves alike.
  SELECT business_type_id INTO v_type FROM categories WHERE slug = 'health-beauty';
  ASSERT v_type IS NULL, 'Health & Beauty should stay global, not pinned';

  -- ──────────────────── what each vertical actually sees ──────────────────
  -- The app's rule: business_type_id = mine OR IS NULL.
  SELECT count(*) INTO v_count
    FROM categories
   WHERE business_type_id = v_food OR business_type_id IS NULL;
  ASSERT v_count = 2,
    'an F&B shop should see Food & Beverages plus the global row only';

  -- The defect this whole phase exists to fix.
  SELECT count(*) INTO v_count
    FROM categories
   WHERE (business_type_id = v_food OR business_type_id IS NULL)
     AND slug = 'electronics-gadgets';
  ASSERT v_count = 0, 'a café is still being offered Electronics & Gadgets';

  -- A vertical with no categories of its own still gets the global ones, so
  -- its picker is never empty.
  SELECT id INTO v_type FROM business_types WHERE name = 'Services';
  SELECT count(*) INTO v_count
    FROM categories
   WHERE business_type_id = v_type OR business_type_id IS NULL;
  ASSERT v_count >= 1,
    'a vertical with no mapped categories must still see the global ones';

  RAISE NOTICE 'mapping + visibility assertions passed';
END $$;

-- ────────────────────── nothing was orphaned ───────────────────────────────
DO $$
DECLARE
  v_orphans INTEGER;
BEGIN
  -- Every product's category must still be reachable from its own shop's
  -- vertical, or the owner would see a category on the row that the picker can
  -- no longer offer.
  SELECT count(*) INTO v_orphans
  FROM products p
  JOIN categories c   ON c.id = p.category_id
  JOIN businesses b   ON b.id = p.business_id
  WHERE p.category_id IS NOT NULL
    AND b.business_type_id IS NOT NULL
    AND c.business_type_id IS NOT NULL
    AND c.business_type_id <> b.business_type_id;

  ASSERT v_orphans = 0,
    format('%s products now carry a category their vertical cannot offer',
           v_orphans);

  RAISE NOTICE 'orphan check passed';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL CATEGORY SCOPING TESTS PASSED'; END $$;

ROLLBACK;
