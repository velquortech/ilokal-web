-- Behavioral tests for migration 20260806090000 (menu follow-up read side).
--
-- The RPC is admin-only (service_role) and reads every shop's owner email, so
-- these pin who may run it and exactly which shops it returns. Non-destructive
-- (rolled back).
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/menu_followup.test.sql
--
-- Expected tail: "ALL MENU FOLLOWUP TESTS PASSED".

BEGIN;

DO $$
DECLARE
  v_owner    UUID;
  v_type     UUID;
  v_verified UUID;
  v_pending  UUID;
  v_withmenu UUID;
  v_count    INTEGER;
  v_row      RECORD;
BEGIN
  -- A real owner + type to hang fixtures off (FKs point at auth.users /
  -- business_types).
  SELECT owner_id INTO v_owner FROM businesses LIMIT 1;
  SELECT id INTO v_type FROM business_types WHERE offering_profile IS NOT NULL LIMIT 1;
  ASSERT v_owner IS NOT NULL, 'fixture missing: no owner';

  -- A verified shop with NO offerings — must appear.
  INSERT INTO businesses (owner_id, shop_name, status, business_type_id, offering_mode)
  VALUES (v_owner, 'ZZ Test No Menu', 'verified', v_type, 'products')
  RETURNING id INTO v_verified;

  -- A PENDING shop with no offerings — must NOT appear (not verified). The
  -- `set_business_initial_status` BEFORE INSERT trigger forces a new shop to
  -- `verified` when auto-verify is on, so the status is set by UPDATE after.
  INSERT INTO businesses (owner_id, shop_name, status, business_type_id, offering_mode)
  VALUES (v_owner, 'ZZ Test Pending', 'pending', v_type, 'products')
  RETURNING id INTO v_pending;
  UPDATE businesses SET status = 'pending' WHERE id = v_pending;

  -- A verified shop WITH a live offering — must NOT appear.
  INSERT INTO businesses (owner_id, shop_name, status, business_type_id, offering_mode)
  VALUES (v_owner, 'ZZ Test Has Menu', 'verified', v_type, 'products')
  RETURNING id INTO v_withmenu;
  INSERT INTO products (business_id, name, price, status)
  VALUES (v_withmenu, 'A product', 100, 'active');

  -- ── 1. the no-menu verified shop is listed ──
  SELECT count(*) INTO v_count
    FROM admin_businesses_missing_menu(NULL, false)
    WHERE id = v_verified;
  ASSERT v_count = 1, 'verified shop with no menu should be listed';

  -- ── 2. a pending shop is never listed ──
  SELECT count(*) INTO v_count
    FROM admin_businesses_missing_menu(NULL, false)
    WHERE id = v_pending;
  ASSERT v_count = 0, 'pending shop must not be listed';

  -- ── 3. a shop with a live offering is never listed ──
  SELECT count(*) INTO v_count
    FROM admin_businesses_missing_menu(NULL, false)
    WHERE id = v_withmenu;
  ASSERT v_count = 0, 'shop with a live menu must not be listed';

  -- ── 4. an archived shop drops off even with no menu ──
  UPDATE businesses SET archived_at = now() WHERE id = v_verified;
  SELECT count(*) INTO v_count
    FROM admin_businesses_missing_menu(NULL, false)
    WHERE id = v_verified;
  ASSERT v_count = 0, 'archived shop must not be listed';
  UPDATE businesses SET archived_at = NULL WHERE id = v_verified;

  -- ── 5. every returned row genuinely has no live menu, and carries an email ──
  FOR v_row IN SELECT * FROM admin_businesses_missing_menu(NULL, false) LOOP
    ASSERT v_row.has_live_menu = false, 'has_live_menu must be false for every row';
    ASSERT v_row.owner_email IS NOT NULL AND v_row.owner_email <> '',
      'every row must carry an owner email';
    ASSERT v_row.offering_noun IS NOT NULL AND v_row.offering_noun <> '',
      'offering_noun must never be blank';
  END LOOP;

  -- ── 6. an unlisted offering does NOT count as a menu (still listed) ──
  INSERT INTO products (business_id, name, price, status)
  VALUES (v_verified, 'Hidden item', 100, 'unlisted');
  SELECT count(*) INTO v_count
    FROM admin_businesses_missing_menu(NULL, false)
    WHERE id = v_verified;
  ASSERT v_count = 1, 'an unlisted-only shop still counts as no menu';

  -- ── 7. search filters by shop name ──
  SELECT count(*) INTO v_count
    FROM admin_businesses_missing_menu('ZZ Test No Menu', false)
    WHERE id = v_verified;
  ASSERT v_count = 1, 'search should match the shop name';
  SELECT count(*) INTO v_count
    FROM admin_businesses_missing_menu('nonexistent-xyz', false);
  ASSERT v_count = 0, 'search should exclude non-matching names';

  -- ── 8. only-no-promo excludes a shop with a live published deal ──
  INSERT INTO coupons (business_id, code, description, discount, start_date, expiry_date, status, promotion_type)
  VALUES (v_verified, 'ZZDEAL', 'x', '{"type":"percentage","value":10}',
          now() - interval '1 day', now() + interval '10 days', 'published', 'deal');
  SELECT count(*) INTO v_count
    FROM admin_businesses_missing_menu(NULL, true)
    WHERE id = v_verified;
  ASSERT v_count = 0, 'only-no-promo must exclude a shop with a live promo';
  -- but it still appears without the promo filter
  SELECT count(*) INTO v_count
    FROM admin_businesses_missing_menu(NULL, false)
    WHERE id = v_verified;
  ASSERT v_count = 1, 'the shop still appears when not filtering on promo';

  RAISE NOTICE 'functional assertions passed';
END $$;

-- ── 9. grants: only service_role may execute ──
DO $$
BEGIN
  ASSERT NOT has_function_privilege('anon',
    'public.admin_businesses_missing_menu(text,boolean)', 'execute'),
    'anon must not execute the RPC';
  ASSERT NOT has_function_privilege('authenticated',
    'public.admin_businesses_missing_menu(text,boolean)', 'execute'),
    'authenticated must not execute the RPC';
  ASSERT has_function_privilege('service_role',
    'public.admin_businesses_missing_menu(text,boolean)', 'execute'),
    'service_role must execute the RPC';

  -- SECURITY DEFINER + pinned search_path (advisor lint).
  ASSERT (SELECT prosecdef FROM pg_proc
          WHERE proname = 'admin_businesses_missing_menu'),
    'function must be SECURITY DEFINER';
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'admin_businesses_missing_menu'
      AND 'search_path=public, pg_temp' = ANY(proconfig)
  ), 'function must pin search_path';

  RAISE NOTICE 'grant assertions passed';
END $$;

-- ── 10. the single-shop send-time re-check (admin_business_followup_target) ──
DO $$
DECLARE
  v_owner    UUID;
  v_type     UUID;
  v_menuless UUID;
  v_withmenu UUID;
  v_row      RECORD;
BEGIN
  SELECT owner_id INTO v_owner FROM businesses LIMIT 1;
  SELECT id INTO v_type FROM business_types WHERE offering_profile IS NOT NULL LIMIT 1;

  INSERT INTO businesses (owner_id, shop_name, status, business_type_id, offering_mode)
  VALUES (v_owner, 'ZZ Target Menuless', 'verified', v_type, 'products')
  RETURNING id INTO v_menuless;

  INSERT INTO businesses (owner_id, shop_name, status, business_type_id, offering_mode)
  VALUES (v_owner, 'ZZ Target HasMenu', 'verified', v_type, 'products')
  RETURNING id INTO v_withmenu;
  INSERT INTO products (business_id, name, price, status)
  VALUES (v_withmenu, 'A product', 100, 'active');

  -- Eligible shop: sendable, has an email and a noun.
  SELECT * INTO v_row FROM admin_business_followup_target(v_menuless);
  ASSERT v_row.is_sendable, 'menuless verified shop must be sendable';
  ASSERT NOT v_row.has_live_menu, 'menuless shop must report no live menu';
  ASSERT v_row.owner_email IS NOT NULL, 'target must carry owner email';
  ASSERT v_row.offering_noun IS NOT NULL AND v_row.offering_noun <> '',
    'target noun must never be blank';

  -- Shop that added a menu: NOT sendable (the send-time refusal).
  SELECT * INTO v_row FROM admin_business_followup_target(v_withmenu);
  ASSERT NOT v_row.is_sendable, 'shop with a live menu must not be sendable';
  ASSERT v_row.has_live_menu, 'shop with a menu must report has_live_menu';

  -- Archiving flips sendable off even with no menu.
  UPDATE businesses SET archived_at = now() WHERE id = v_menuless;
  SELECT * INTO v_row FROM admin_business_followup_target(v_menuless);
  ASSERT NOT v_row.is_sendable, 'archived shop must not be sendable';

  -- Unknown id → no row.
  ASSERT NOT EXISTS (
    SELECT 1 FROM admin_business_followup_target(
      '00000000-0000-0000-0000-000000000000')
  ), 'unknown id must return no row';

  RAISE NOTICE 'target assertions passed';
END $$;

-- ── 11. target RPC grants: service_role only ──
DO $$
BEGIN
  ASSERT NOT has_function_privilege('anon',
    'public.admin_business_followup_target(uuid)', 'execute'),
    'anon must not execute the target RPC';
  ASSERT NOT has_function_privilege('authenticated',
    'public.admin_business_followup_target(uuid)', 'execute'),
    'authenticated must not execute the target RPC';
  ASSERT has_function_privilege('service_role',
    'public.admin_business_followup_target(uuid)', 'execute'),
    'service_role must execute the target RPC';
  ASSERT (SELECT prosecdef FROM pg_proc
          WHERE proname = 'admin_business_followup_target'),
    'target function must be SECURITY DEFINER';
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'admin_business_followup_target'
      AND 'search_path=public, pg_temp' = ANY(proconfig)
  ), 'target function must pin search_path';
  RAISE NOTICE 'target grant assertions passed';
END $$;

ROLLBACK;

\echo 'ALL MENU FOLLOWUP TESTS PASSED'
