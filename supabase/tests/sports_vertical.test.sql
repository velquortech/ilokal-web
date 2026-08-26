-- Behavioral tests for migration 20260826000000 (Sports & Recreation vertical).
--
-- The migration does four things that can each fail silently, so each gets a
-- block below:
--   1. creates a vertical whose NAME the sync trigger matches on,
--   2. re-pins four existing shop types out of three other verticals,
--   3. backfills businesses.business_type_id for shops on those types —
--      the denormalized column the trigger does NOT resync on its own,
--   4. re-scopes the offering-category picker so the moved shops still
--      have something to pick.
--
-- Non-destructive: runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/sports_vertical.test.sql
--
-- Expected tail: "ALL SPORTS VERTICAL TESTS PASSED".

BEGIN;

-- ─────────────────── 1. the vertical itself ───────────────────
DO $$
DECLARE
  v_sports  UUID;
  v_active  BOOLEAN;
  v_icon    TEXT;
  v_profile JSONB;
  v_mode    TEXT;
BEGIN
  SELECT id, is_active, icon, offering_profile
    INTO v_sports, v_active, v_icon, v_profile
    FROM business_types
   WHERE name = 'Sports & Recreation' AND deleted_at IS NULL;

  ASSERT v_sports IS NOT NULL, 'Sports & Recreation vertical does not exist';

  -- Ships ACTIVE, unlike Tourism & Leisure: these trades work as plain
  -- listings, so there is no booking flow to wait for.
  ASSERT v_active, 'Sports & Recreation must ship is_active = true';

  -- The icon string is looked up in `iconMap` (fetchCategories.ts). An icon
  -- with no entry there falls back to Coffee — a coffee cup on the sports tab.
  ASSERT v_icon = 'Dumbbell',
    format('icon should be Dumbbell, got %L', v_icon);

  -- Every mode key must carry a full noun set. resolveOfferingVocabulary
  -- degrades per field, so a missing key is invisible until an owner reads
  -- retail copy on a gym dashboard.
  FOREACH v_mode IN ARRAY ARRAY['products', 'services', 'both'] LOOP
    ASSERT v_profile -> v_mode ? 'singular',  v_mode || ' is missing singular';
    ASSERT v_profile -> v_mode ? 'plural',    v_mode || ' is missing plural';
    ASSERT v_profile -> v_mode ? 'catalogue', v_mode || ' is missing catalogue';
    ASSERT v_profile -> v_mode ? 'shopLabel', v_mode || ' is missing shopLabel';
  END LOOP;

  -- The field policy. per_hour is the one that matters: a court, a gym pass
  -- and PC time are all priced by the hour, and without it the price-type
  -- picker cannot express any of them.
  ASSERT v_profile ? 'fields', 'offering_profile has no fields policy';
  ASSERT v_profile ? 'default_booking_mode', 'no default_booking_mode';
  ASSERT v_profile -> 'allowed_price_types' @> '"per_hour"'::jsonb,
    'allowed_price_types must include per_hour';
  ASSERT v_profile -> 'fields' @> '"capacity"'::jsonb
     AND v_profile -> 'fields' @> '"inventory_count"'::jsonb,
    'a court needs capacity (players) and inventory_count (how many courts)';

  RAISE NOTICE '1. vertical OK';
END $$;

-- ─────────────────── 2. the shop types ───────────────────
DO $$
DECLARE
  v_sports UUID;
  v_count  INTEGER;
  v_name   TEXT;
BEGIN
  SELECT id INTO v_sports FROM business_types WHERE name = 'Sports & Recreation';

  -- All six live under Sports: five re-pinned, one net-new. There is no
  -- eSports row: 'Computer / Internet Shop' already existed on production and
  -- was adopted instead of duplicated.
  FOREACH v_name IN ARRAY ARRAY[
    'Sports / Outdoor Shop', 'Fitness Studio / Gym',
    'Billiards / Recreation Hall', 'Game Center / Arcade',
    'Sports Court / Facility Rental', 'Computer / Internet Shop'
  ] LOOP
    SELECT count(*) INTO v_count
      FROM business_categories
     WHERE name = v_name AND business_type_id = v_sports
       AND deleted_at IS NULL;
    ASSERT v_count = 1,
      format('%L should be exactly one live row under Sports, found %s',
             v_name, v_count);
  END LOOP;

  -- And nothing was COPIED instead of moved. business_categories has no
  -- unique on name, so a careless INSERT leaves the original in place and
  -- the trade appears under two verticals at once.
  SELECT count(*) INTO v_count
    FROM business_categories bc
    JOIN business_types bt ON bt.id = bc.business_type_id
   WHERE bc.name IN ('Sports / Outdoor Shop', 'Fitness Studio / Gym',
                     'Billiards / Recreation Hall', 'Game Center / Arcade',
                     'Computer / Internet Shop')
     AND bt.name <> 'Sports & Recreation'
     AND bc.deleted_at IS NULL;
  ASSERT v_count = 0,
    format('%s of the moved shop types still exist under their old vertical',
           v_count);

  -- Bike Shop was deliberately LEFT under Retail — a bike shop's trade is
  -- goods, the same shape as Auto Supply. Pinned so a later over-eager sweep
  -- has to argue with a test.
  SELECT count(*) INTO v_count
    FROM business_categories bc
    JOIN business_types bt ON bt.id = bc.business_type_id
   WHERE bc.name = 'Bike Shop' AND bt.name = 'Retail';
  ASSERT v_count = 1, 'Bike Shop must stay under Retail';

  -- 20260819010000 gives every ACTIVE vertical exactly one 'General' row —
  -- the last resort for a shop no specific card describes. It selected on
  -- is_active at ITS runtime, so a vertical added later silently has none.
  SELECT count(*) INTO v_count
    FROM business_categories
   WHERE name = 'General' AND business_type_id = v_sports
     AND deleted_at IS NULL;
  ASSERT v_count = 1,
    format('Sports needs exactly one live General row, found %s', v_count);

  RAISE NOTICE '2. shop types OK';
END $$;

-- ─────────────────── 3. images ───────────────────
DO $$
DECLARE
  v_bad INTEGER;
BEGIN
  -- ShopCategoryStep renders <Image src={item.imageURL}>. A NULL or blank
  -- src does not render an empty tile, it THROWS and takes the whole
  -- registration step down.
  SELECT count(*) INTO v_bad
    FROM business_categories bc
    JOIN business_types bt ON bt.id = bc.business_type_id
   WHERE bt.name = 'Sports & Recreation'
     AND bc.deleted_at IS NULL
     AND (bc.image_url IS NULL OR btrim(bc.image_url) = '');
  ASSERT v_bad = 0,
    format('%s Sports shop types have no image — registration would crash', v_bad);

  -- An allowlisted host is not enough on its own: picsum answers 302 to a
  -- host that is NOT allowlisted, and CSP re-checks every redirect hop, so
  -- the tile renders as alt text. images.unsplash.com serves 200 directly.
  SELECT count(*) INTO v_bad
    FROM business_categories bc
    JOIN business_types bt ON bt.id = bc.business_type_id
   WHERE bt.name = 'Sports & Recreation'
     AND bc.deleted_at IS NULL
     AND bc.image_url NOT LIKE 'https://images.unsplash.com/%'
     AND bc.image_url NOT LIKE '/%';
  ASSERT v_bad = 0,
    format('%s Sports images are on a host CSP will block', v_bad);

  -- Every Sports image uses the CURRENT parameter shape. `h=1200` forces the
  -- 4:3 crop the cards top-crop into (they have no object-cover), and the
  -- legacy w=2340/ixlib form leaves that unpredictable. One row — the gym,
  -- inherited from the 2026 seed — had it until this migration normalised it.
  SELECT count(*) INTO v_bad
    FROM business_categories bc
    JOIN business_types bt ON bt.id = bc.business_type_id
   WHERE bt.name = 'Sports & Recreation'
     AND bc.deleted_at IS NULL
     AND bc.image_url LIKE 'https://images.unsplash.com/%'
     AND split_part(bc.image_url, '?', 2)
         <> 'q=80&w=1600&h=1200&fit=crop&auto=format';
  ASSERT v_bad = 0,
    format('%s Sports images do not use the standard crop params', v_bad);

  RAISE NOTICE '3. images OK';
END $$;

-- ─────────────────── 4. the backfill ───────────────────
DO $$
DECLARE
  v_divergent INTEGER;
  v_services  INTEGER;
BEGIN
  -- THE point of the migration's step 4. businesses.business_type_id is
  -- denormalized, and sync_business_type_id fires only on INSERT or on a
  -- category_id UPDATE — so re-pinning a shop type leaves every existing
  -- shop on it pointing at the OLD vertical, which is what makes
  -- getCategoryDivergence start showing owners a banner.
  --
  -- Asserted globally rather than only over Sports: the whole table was
  -- clean before this migration, so anything divergent afterwards is ours.
  SELECT count(*) INTO v_divergent
    FROM businesses b
    JOIN business_categories bc ON bc.id = b.category_id
   WHERE b.business_type_id IS DISTINCT FROM bc.business_type_id;
  ASSERT v_divergent = 0,
    format('%s businesses diverge from their category vertical', v_divergent);

  -- offering_mode must NOT have been rewritten. The moved shops hold a mix
  -- of 'services' (gyms) and 'both' (arcade, billiards) and each is correct;
  -- the trigger is INSERT-only precisely so a settled choice is never
  -- overwritten. At least one survivor proves the backfill left it alone.
  -- Asserted as "something is NOT the vertical default" rather than "something
  -- is 'services'": the vertical maps to 'both', so if the backfill had
  -- stamped the mapping onto the moved shops, every row here would read
  -- 'both'. On production the two survivors are 'services' (a gym) and
  -- 'products' (an iCafe) — both correct, and neither is what the trigger
  -- would have written.
  SELECT count(*) INTO v_services
    FROM businesses b
    JOIN business_types bt ON bt.id = b.business_type_id
   WHERE bt.name = 'Sports & Recreation' AND b.offering_mode <> 'both';
  ASSERT v_services > 0,
    'every Sports business reads the vertical default — the backfill '
    'overwrote a settled owner choice';

  RAISE NOTICE '4. backfill OK';
END $$;

-- ─────────────────── 5. the trigger ───────────────────
DO $$
DECLARE
  v_owner UUID;
  v_cat   UUID;
  v_biz   UUID;
  v_mode  TEXT;
  v_type  UUID;
  v_sports UUID;
BEGIN
  SELECT owner_id INTO v_owner FROM businesses LIMIT 1;
  ASSERT v_owner IS NOT NULL, 'fixture missing: no owner';

  SELECT id INTO v_sports FROM business_types WHERE name = 'Sports & Recreation';
  SELECT id INTO v_cat FROM business_categories
   WHERE name = 'Sports Court / Facility Rental' AND business_type_id = v_sports;

  -- offering_mode is passed as 'products' on purpose: the CASE arm must
  -- OVERRIDE it. Passing nothing would let the column default pass the test
  -- without the arm existing.
  INSERT INTO businesses (owner_id, shop_name, status, category_id, offering_mode)
  VALUES (v_owner, 'ZZ Test Sports Court', 'verified', v_cat, 'products')
  RETURNING id, business_type_id, offering_mode INTO v_biz, v_type, v_mode;

  ASSERT v_type = v_sports,
    'trigger did not resolve business_type_id from the Sports category';
  ASSERT v_mode = 'both',
    format('sync_business_type_id has no Sports & Recreation arm (mode=%L)', v_mode);

  RAISE NOTICE '5. trigger OK';
END $$;

-- ─────────────────── 6. the offering-category picker ───────────────────
DO $$
DECLARE
  v_sports  UUID;
  v_own     INTEGER;
  v_global  INTEGER;
  v_stray   INTEGER;
BEGIN
  SELECT id INTO v_sports FROM business_types WHERE name = 'Sports & Recreation';

  SELECT count(*) INTO v_own
    FROM categories WHERE business_type_id = v_sports;
  SELECT count(*) INTO v_global
    FROM categories WHERE business_type_id IS NULL;

  -- The picker reads "my vertical OR global". A moved gym whose vertical has
  -- nothing pinned to it sees only the globals — and a picker with one or two
  -- entries is not a choice, it is a required field with a default.
  ASSERT v_own >= 6,
    format('Sports has only %s offering categories of its own', v_own);
  ASSERT v_own + v_global >= 9,
    format('Sports picker is %s entries — too thin to be a real choice',
           v_own + v_global);

  -- The two re-pinned ones actually moved rather than being duplicated.
  SELECT count(*) INTO v_stray
    FROM categories c
    JOIN business_types bt ON bt.id = c.business_type_id
   WHERE c.name IN ('Sports & Outdoor', 'Fitness & Classes')
     AND bt.name <> 'Sports & Recreation';
  ASSERT v_stray = 0,
    'Sports & Outdoor / Fitness & Classes still pinned to their old vertical';

  RAISE NOTICE '6. offering categories OK';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL SPORTS VERTICAL TESTS PASSED'; END $$;

ROLLBACK;
