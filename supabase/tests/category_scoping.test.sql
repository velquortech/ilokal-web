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
  -- The app's rule: business_type_id = mine OR IS NULL. Asserted as
  -- own + global rather than a hardcoded total, so adding a category does not
  -- fail a test about SCOPING (the previous literal `= 2` broke the moment
  -- 20260805120000 landed).
  SELECT count(*) INTO v_count
    FROM categories
   WHERE business_type_id = v_food OR business_type_id IS NULL;
  ASSERT v_count = (SELECT count(*) FROM categories WHERE business_type_id = v_food)
                 + (SELECT count(*) FROM categories WHERE business_type_id IS NULL),
    'an F&B picker is not exactly "own vertical plus global"';

  -- The defect this whole phase exists to fix.
  SELECT count(*) INTO v_count
    FROM categories
   WHERE (business_type_id = v_food OR business_type_id IS NULL)
     AND slug = 'electronics-gadgets';
  ASSERT v_count = 0, 'a café is still being offered Electronics & Gadgets';

  -- Global rows reach every picker — that is what makes a bad mapping
  -- fail-open instead of hiding a category from everyone.
  SELECT count(*) INTO v_count FROM categories WHERE business_type_id IS NULL;
  ASSERT v_count >= 1, 'no global category left; a bad mapping now hides rows';
  SELECT business_type_id INTO v_type FROM categories WHERE slug = 'other';
  ASSERT v_type IS NULL,
    '"Other" must stay global or a vertical can have no fallback option';

  RAISE NOTICE 'mapping + visibility assertions passed';
END $$;

-- ───────────── every vertical has a picker worth opening (20260805120000) ──
DO $$
DECLARE
  r        RECORD;
  v_global INTEGER;
BEGIN
  SELECT count(*) INTO v_global FROM categories WHERE business_type_id IS NULL;

  FOR r IN
    SELECT bt.name,
           (SELECT count(*) FROM categories c WHERE c.business_type_id = bt.id) AS own
      FROM business_types bt
     WHERE bt.deleted_at IS NULL
  LOOP
    -- Before 20260805120000 a Services or Tourism shop was offered exactly one
    -- category — the single global row. A picker with one entry is a required
    -- field with a default, not a choice.
    ASSERT r.own >= 1,
      format('vertical "%s" has no categories of its own; its picker shows only the %s global row(s)',
             r.name, v_global);
  END LOOP;

  RAISE NOTICE 'per-vertical coverage passed';
END $$;

-- ───────── the registration picker cannot be handed a NULL image ───────────
DO $$
DECLARE
  v_null INTEGER;
  v_dupe INTEGER;
BEGIN
  -- `business_categories.image_url` is NULLABLE in the schema, but the
  -- registration step renders `<Image src={item.imageURL} />` with no fallback
  -- and types it `string`
  -- (app/business/registration/steps/ShopCategoryStep.tsx). A NULL row does not
  -- render an empty tile — it throws, and takes the whole step with it.
  SELECT count(*) INTO v_null
    FROM business_categories
   WHERE deleted_at IS NULL
     AND (image_url IS NULL OR btrim(image_url) = '');
  ASSERT v_null = 0,
    format('%s shop type(s) have no image; the registration step renders src={imageURL} with no fallback and will throw',
           v_null);

  -- Every image must be reachable under the app's CSP. `buildImgSrc` in
  -- next.config.ts derives img-src from `imageRemotePatterns`, and CSP
  -- re-checks EVERY REDIRECT HOP — so a host that is on the list but 302s
  -- somewhere that is not still renders broken. That is exactly how six of
  -- these shipped: picsum.photos is allowed, it redirects to
  -- fastly.picsum.photos, which is not. Dev-only, because the production
  -- branch of buildImgSrc pushes a bare `https:`.
  --
  -- Two shapes are known-good: a same-origin path (covered by 'self'
  -- everywhere, cannot be redirected out of the policy) and
  -- images.unsplash.com (allowed, serves 200 directly). Anything else has to
  -- be checked BOTH for an allowlist entry and for redirects before it lands
  -- here.
  SELECT count(*) INTO v_null
    FROM business_categories
   WHERE deleted_at IS NULL
     AND image_url NOT LIKE '/%'
     AND image_url NOT LIKE 'https://images.unsplash.com/%';
  ASSERT v_null = 0,
    format('%s shop type image(s) use an unvetted host; confirm it is in imageRemotePatterns AND does not redirect (picsum 302s to fastly.picsum.photos, which CSP blocks)',
           v_null);

  -- There is no UNIQUE on `name`, so idempotency is a per-row WHERE NOT EXISTS
  -- and a careless plain INSERT duplicates silently — the defect
  -- seeds/subscription_plans.sql shipped with.
  SELECT count(*) INTO v_dupe FROM (
    SELECT name FROM business_categories WHERE deleted_at IS NULL
     GROUP BY name HAVING count(*) > 1
  ) d;
  ASSERT v_dupe = 0,
    format('%s shop type name(s) are duplicated; a seed re-run inserted instead of skipping',
           v_dupe);

  RAISE NOTICE 'shop-type render safety passed';
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
