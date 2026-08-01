-- Behavioral tests for migration 20260801061117 (shop sections).
--
-- The design claim these defend: a section is SHOP-LOCAL. It must be writable
-- by its owner, invisible to nobody else's write path, and it must never be
-- able to take products with it when it goes. Plus the two guards that keep it
-- from becoming a nav/spam surface (unique per shop, capped at 30).
--
-- Non-destructive: everything runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/product_sections.test.sql
--
-- Expected tail: "ALL SECTION TESTS PASSED".

BEGIN;

-- Impersonation helper: the policies read auth.uid(), which resolves from the
-- request.jwt.claims GUC.
CREATE OR REPLACE FUNCTION pg_temp.act_as(p_user UUID) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', p_user::text, 'role', 'authenticated')::text,
                     true);
END $$;

DO $$
DECLARE
  v_biz      UUID;
  v_owner    UUID;
  v_other    UUID;
  v_stranger UUID;
  v_section  UUID;
  v_prod     UUID;
  v_count    INTEGER;
  v_failed   BOOLEAN;
  v_name     TEXT;
BEGIN
  SELECT id, owner_id INTO v_biz, v_owner
    FROM businesses WHERE status = 'verified' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO v_other FROM businesses WHERE id <> v_biz LIMIT 1;
  -- Must be non-admin, or is_admin() would legitimately satisfy the policies
  -- and mask every authorization assertion below.
  SELECT id INTO v_stranger FROM profiles
    WHERE role = 'app_user' AND id <> v_owner LIMIT 1;
  ASSERT v_biz IS NOT NULL AND v_other IS NOT NULL AND v_stranger IS NOT NULL,
    'fixtures missing: need two businesses and a non-admin profile';

  -- ─────────────────────── owner can create + order ───────────────────────
  INSERT INTO product_sections (business_id, name, position)
  VALUES (v_biz, 'Hot Drinks', 0)
  RETURNING id INTO v_section;
  ASSERT v_section IS NOT NULL, 'owner insert failed';

  -- ───────────── same-shop duplicate names die, case-insensitively ─────────
  v_failed := FALSE;
  BEGIN
    INSERT INTO product_sections (business_id, name) VALUES (v_biz, '  hot drinks ');
  EXCEPTION WHEN unique_violation THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'duplicate section name (different case/padding) was allowed';

  -- ...but the SAME name in a DIFFERENT shop is fine. Two cafés both having
  -- "Hot Drinks" is the normal case, and the whole point of shop-local naming.
  INSERT INTO product_sections (business_id, name) VALUES (v_other, 'Hot Drinks');

  -- ──────────────────────────── name CHECK ────────────────────────────────
  v_failed := FALSE;
  BEGIN
    INSERT INTO product_sections (business_id, name) VALUES (v_biz, '   ');
  EXCEPTION WHEN check_violation THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'blank section name was allowed';

  v_failed := FALSE;
  BEGIN
    INSERT INTO product_sections (business_id, name)
    VALUES (v_biz, repeat('x', 41));
  EXCEPTION WHEN check_violation THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'over-long section name was allowed';

  -- ─────────────── archiving releases products, never deletes ─────────────
  INSERT INTO products (business_id, name, price, price_type, status, section_id)
  VALUES (v_biz, 'ST Flat White', 185, 'fixed', 'active', v_section)
  RETURNING id INTO v_prod;

  UPDATE product_sections SET archived_at = now() WHERE id = v_section;

  SELECT count(*) INTO v_count FROM products WHERE id = v_prod;
  ASSERT v_count = 1, 'archiving a section deleted its products';

  SELECT count(*) INTO v_count
    FROM products WHERE id = v_prod AND section_id IS NULL;
  ASSERT v_count = 1,
    'archived section left a dangling section_id (should fall to Uncategorised)';

  -- An archived name is released, so the owner can reuse it.
  INSERT INTO product_sections (business_id, name) VALUES (v_biz, 'Hot Drinks')
  RETURNING id INTO v_section;

  -- ───────────────────────────── the 30 cap ───────────────────────────────
  -- One live section exists; add 29 to reach the cap exactly.
  FOR v_count IN 1..29 LOOP
    INSERT INTO product_sections (business_id, name)
    VALUES (v_biz, 'Cap ' || v_count);
  END LOOP;

  v_failed := FALSE;
  BEGIN
    INSERT INTO product_sections (business_id, name) VALUES (v_biz, 'One Too Many');
  EXCEPTION WHEN SQLSTATE 'IL003' THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'the 30-section cap did not fire';

  -- Archived sections must not count against the cap.
  UPDATE product_sections SET archived_at = now()
   WHERE business_id = v_biz AND name = 'Cap 1';
  INSERT INTO product_sections (business_id, name) VALUES (v_biz, 'After Archive');

  RAISE NOTICE 'constraint + lifecycle assertions passed';

  -- ──────────────────────────── counts RPC ────────────────────────────────
  -- Includes a NULL row for Uncategorised, and counts only live products.
  SELECT product_count INTO v_count
    FROM section_product_counts(v_biz) WHERE section_id IS NULL;
  ASSERT v_count >= 1, 'Uncategorised bucket missing from section_product_counts';

  UPDATE products SET section_id = v_section WHERE id = v_prod;
  SELECT product_count INTO v_count
    FROM section_product_counts(v_biz) WHERE section_id = v_section;
  ASSERT v_count = 1, 'section count wrong after assigning a product';

  UPDATE products SET archived_at = now() WHERE id = v_prod;
  SELECT coalesce(sum(product_count), 0) INTO v_count
    FROM section_product_counts(v_biz) WHERE section_id = v_section;
  ASSERT v_count = 0, 'archived products still counted';
  UPDATE products SET archived_at = NULL WHERE id = v_prod;

  RAISE NOTICE 'counts RPC assertions passed';
END $$;

-- ─────────────────────── RLS, as a real non-owner ──────────────────────────
-- The DO block above runs as postgres, which bypasses RLS entirely; these have
-- to run under an actual role for the policies to be exercised.
DO $$
DECLARE
  v_biz       UUID;
  v_owner     UUID;
  v_other     UUID;
  v_stranger  UUID;
  v_section   UUID;
  v_other_sec UUID;
BEGIN
  SELECT id, owner_id INTO v_biz, v_owner
    FROM businesses WHERE status = 'verified' AND archived_at IS NULL LIMIT 1;
  -- A SECOND shop, deliberately: the block above filled v_biz to its 30
  -- section cap, and the BEFORE INSERT cap trigger runs ahead of the RLS
  -- WITH CHECK — so an insert probe aimed at v_biz would raise IL003 and
  -- never reach the policy this is meant to test.
  SELECT b.id INTO v_other
    FROM businesses b
   WHERE b.id <> v_biz AND b.status = 'verified' AND b.archived_at IS NULL
   LIMIT 1;
  SELECT id INTO v_stranger FROM profiles
    WHERE role = 'app_user' AND id <> v_owner LIMIT 1;
  SELECT id INTO v_section FROM product_sections
    WHERE business_id = v_biz AND archived_at IS NULL LIMIT 1;

  INSERT INTO product_sections (business_id, name)
  VALUES (v_other, 'Owned By Someone Else')
  RETURNING id INTO v_other_sec;

  PERFORM set_config('test.biz', v_biz::text, TRUE);
  PERFORM set_config('test.other', v_other::text, TRUE);
  PERFORM set_config('test.owner', v_owner::text, TRUE);
  PERFORM set_config('test.stranger', v_stranger::text, TRUE);
  PERFORM set_config('test.section', v_section::text, TRUE);
  PERFORM set_config('test.other_section', v_other_sec::text, TRUE);
END $$;

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_biz       UUID := current_setting('test.biz')::uuid;
  v_other     UUID := current_setting('test.other')::uuid;
  v_stranger  UUID := current_setting('test.stranger')::uuid;
  v_section   UUID := current_setting('test.section')::uuid;
  v_other_sec UUID := current_setting('test.other_section')::uuid;
  v_owner     UUID := current_setting('test.owner')::uuid;
  v_failed    BOOLEAN;
  v_count     INTEGER;
BEGIN
  PERFORM pg_temp.act_as(v_stranger);

  -- A stranger may READ a verified shop's sections — the public shop page
  -- needs exactly that.
  SELECT count(*) INTO v_count FROM product_sections WHERE business_id = v_biz;
  ASSERT v_count > 0, 'public read of a verified shop''s sections was blocked';

  -- ...but may not create, rename or archive one.
  v_failed := FALSE;
  BEGIN
    INSERT INTO product_sections (business_id, name)
    VALUES (v_other, 'Stranger Section');
  EXCEPTION WHEN insufficient_privilege THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'a non-owner inserted a section into someone else''s shop';

  UPDATE product_sections SET name = 'Hijacked' WHERE id = v_other_sec;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'a non-owner renamed someone else''s section';

  UPDATE product_sections SET archived_at = now() WHERE id = v_other_sec;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'a non-owner archived someone else''s section';

  DELETE FROM product_sections WHERE id = v_other_sec;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'a non-owner deleted someone else''s section';

  -- The owner can do all of it.
  PERFORM pg_temp.act_as(v_owner);
  UPDATE product_sections SET name = 'Renamed By Owner' WHERE id = v_section;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 1, 'the owner could not rename their own section';

  RAISE NOTICE 'RLS assertions passed';
END $$;

RESET ROLE;

-- ───────────────── every policy wraps its auth call (P1) ───────────────────
DO $$
DECLARE
  v_bad INTEGER;
BEGIN
  -- Postgres stores a wrapped call as "( SELECT auth.uid() AS uid)". Strip
  -- that exact rendering and anything left is a BARE auth.uid(), which
  -- re-evaluates once per row scanned. (POSIX regex has no lookbehind, so this
  -- is a replace-then-search rather than a negative lookbehind.)
  SELECT count(*) INTO v_bad
  FROM pg_policies
  WHERE tablename = 'product_sections'
    AND (
      replace(coalesce(qual, ''), '( SELECT auth.uid() AS uid)', '')
        ~ 'auth\.uid\(\)'
      OR replace(coalesce(with_check, ''), '( SELECT auth.uid() AS uid)', '')
        ~ 'auth\.uid\(\)'
    );
  ASSERT v_bad = 0,
    'a product_sections policy calls auth.uid() unwrapped (RLS initPlan)';

  -- And the write path is not accidentally wide open.
  SELECT count(*) INTO v_bad
  FROM pg_policies
  WHERE tablename = 'product_sections'
    AND cmd IN ('ALL', 'INSERT', 'UPDATE')
    AND coalesce(with_check, 'true') = 'true';
  ASSERT v_bad = 0, 'a product_sections write policy has no WITH CHECK';

  RAISE NOTICE 'policy-shape assertions passed';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL SECTION TESTS PASSED'; END $$;

ROLLBACK;
