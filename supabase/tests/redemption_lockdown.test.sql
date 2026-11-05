-- Behavioral tests for migration 20261024000000 (redemption write lockdown +
-- RLS on the two tables that shipped without it).
-- Non-destructive: everything runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/redemption_lockdown.test.sql
--
-- Expected tail: "ALL REDEMPTION LOCKDOWN TESTS PASSED".

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.act_as(p_user UUID) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', p_user::text, 'role', 'authenticated')::text,
                     true);
END $$;

-- Expect `sql` to raise with MESSAGE = p_code.
CREATE OR REPLACE FUNCTION pg_temp.expect_error(p_sql text, p_code text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'expected % but call succeeded: %', p_code, p_sql;
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'expected % but call succeeded%' THEN RAISE; END IF;
  IF SQLERRM <> p_code THEN
    RAISE EXCEPTION 'expected %, got % (%)', p_code, SQLERRM, p_sql;
  END IF;
END $$;

-- Expect `sql` to be refused by a privilege check (SQLSTATE 42501) or by an
-- RLS WITH CHECK (also 42501).
CREATE OR REPLACE FUNCTION pg_temp.expect_denied(p_sql text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'expected permission denied but call succeeded: %', p_sql;
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;

-- 1. Grants and RLS flags — the static half of the three holes.
DO $$
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.increment_coupon_redemptions(uuid)', 'EXECUTE'),
    'anon can still execute increment_coupon_redemptions';
  ASSERT NOT has_function_privilege('authenticated', 'public.increment_coupon_redemptions(uuid)', 'EXECUTE'),
    'authenticated can still execute increment_coupon_redemptions';

  ASSERT NOT has_function_privilege('anon', 'public.redeem_coupon(uuid, uuid)', 'EXECUTE'),
    'anon can execute redeem_coupon';
  ASSERT has_function_privilege('authenticated', 'public.redeem_coupon(uuid, uuid)', 'EXECUTE'),
    'authenticated cannot execute redeem_coupon';
  ASSERT NOT has_function_privilege('anon', 'public.claim_my_redemption(uuid)', 'EXECUTE'),
    'anon can execute claim_my_redemption';
  ASSERT has_function_privilege('authenticated', 'public.claim_my_redemption(uuid)', 'EXECUTE'),
    'authenticated cannot execute claim_my_redemption';

  ASSERT NOT has_table_privilege('authenticated', 'public.user_redemptions', 'INSERT'),
    'authenticated can still INSERT user_redemptions directly';
  ASSERT NOT has_table_privilege('authenticated', 'public.user_redemptions', 'UPDATE'),
    'authenticated can still UPDATE user_redemptions directly';
  ASSERT NOT has_table_privilege('authenticated', 'public.user_redemptions', 'DELETE'),
    'authenticated can still DELETE user_redemptions directly';
  ASSERT has_table_privilege('authenticated', 'public.user_redemptions', 'SELECT'),
    'authenticated lost SELECT on user_redemptions (wallet reads)';
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_policy
     WHERE polrelid = 'public.user_redemptions'::regclass
       AND polname = 'Users manage own interactions'),
    'the permissive FOR ALL redemptions policy is still present';

  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.bida_of_the_day'::regclass),
    'RLS is off on bida_of_the_day';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.view_count_history'::regclass),
    'RLS is off on view_count_history';
  ASSERT NOT has_table_privilege('anon', 'public.bida_of_the_day', 'SELECT,INSERT,UPDATE,DELETE'),
    'anon still has privileges on bida_of_the_day';
  ASSERT NOT has_table_privilege('anon', 'public.view_count_history', 'SELECT,INSERT,UPDATE,DELETE'),
    'anon still has privileges on view_count_history';
  ASSERT NOT has_table_privilege('authenticated', 'public.view_count_history', 'SELECT,INSERT,UPDATE,DELETE'),
    'authenticated still has privileges on view_count_history';
  RAISE NOTICE '1 ok: grants and RLS flags';
END $$;

-- 2. Behaviour: redeem / claim through the RPCs, direct writes refused.
DO $$
DECLARE
  v_coupon  uuid;
  v_biz     uuid;
  v_branch  uuid;
  v_other_branch uuid;
  u1 uuid; u2 uuid;
  v_row     public.user_redemptions;
  v_count_before int;
  v_count_after  int;
  v_n int;
BEGIN
  -- A coupon on a verified, live business with a live branch; and two
  -- ordinary users (not that business's owner).
  SELECT c.id, c.business_id, br.id
    INTO v_coupon, v_biz, v_branch
    FROM coupons c
    JOIN businesses b ON b.id = c.business_id
    JOIN branches br ON br.business_id = b.id
   WHERE b.status = 'verified' AND b.archived_at IS NULL AND br.archived_at IS NULL
   ORDER BY c.id
   LIMIT 1;
  ASSERT v_coupon IS NOT NULL, 'fixture: no coupon on a verified business with a branch';

  SELECT br.id INTO v_other_branch
    FROM branches br
   WHERE br.business_id <> v_biz AND br.archived_at IS NULL
   LIMIT 1;
  ASSERT v_other_branch IS NOT NULL, 'fixture: need a branch of another business';

  -- app_user only: a seeded admin passes the is_admin() policy and would read
  -- every redemption, which is correct behavior but not what 2f asserts.
  SELECT id INTO u1 FROM profiles p
   WHERE p.role = 'app_user'
     AND NOT EXISTS (SELECT 1 FROM businesses ob WHERE ob.owner_id = p.id)
   ORDER BY p.id LIMIT 1;
  SELECT id INTO u2 FROM profiles p
   WHERE p.id > u1 AND p.role = 'app_user' AND NOT EXISTS (SELECT 1 FROM businesses ob WHERE ob.owner_id = p.id)
   ORDER BY p.id LIMIT 1;
  ASSERT u2 IS NOT NULL, 'fixture: need two non-owner profiles';

  -- Put the coupon into a known, redeemable state.
  UPDATE coupons
     SET status = 'published', archived_at = NULL,
         start_date = now() - interval '1 day', expiry_date = now() + interval '7 days',
         max_redemptions_global = NULL, max_redemptions_per_user = NULL,
         current_redemptions = 0, requires_follow = false, branch_id = NULL
   WHERE id = v_coupon;
  DELETE FROM user_redemptions WHERE coupon_id = v_coupon AND user_id IN (u1, u2);
  DELETE FROM follows WHERE user_id = u1 AND business_id = v_biz;

  -- 2a. Direct writes are refused at the privilege layer.
  PERFORM pg_temp.act_as(u1);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_denied(format(
    'INSERT INTO user_redemptions (user_id, coupon_id, branch_id, is_claimed) VALUES (%L, %L, %L, true)',
    u1, v_coupon, v_branch));
  -- (increment_coupon_redemptions is checked statically in block 1, never
  -- called here: on the local supabase/postgres 17.6.1.106 image ANY
  -- permission-denied function call segfaults the backend — pre-existing,
  -- reproducible with snapshot_weekly_view_history(), unrelated to this
  -- migration.)
  RESET ROLE;

  -- 2b. A valid redeem returns the row and bumps the counter exactly once.
  SELECT current_redemptions INTO v_count_before FROM coupons WHERE id = v_coupon;
  PERFORM pg_temp.act_as(u1);
  SET LOCAL ROLE authenticated;
  SELECT * INTO v_row FROM public.redeem_coupon(v_coupon, v_branch);
  RESET ROLE;
  ASSERT v_row.id IS NOT NULL, 'redeem_coupon returned no row';
  ASSERT v_row.user_id = u1, 'redemption not owned by the caller';
  ASSERT v_row.branch_id = v_branch, 'redemption branch not recorded';
  ASSERT v_row.is_claimed = false, 'new redemption is already claimed';
  ASSERT v_row.code IS NOT NULL, 'redemption code not assigned';
  ASSERT v_row.expires_at = (SELECT expiry_date FROM coupons WHERE id = v_coupon),
    'expires_at is not the coupon expiry';
  SELECT current_redemptions INTO v_count_after FROM coupons WHERE id = v_coupon;
  ASSERT v_count_after = v_count_before + 1, 'counter did not move by exactly one';

  -- 2c. The caller still sees it (wallet read stays open).
  PERFORM pg_temp.act_as(u1);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM user_redemptions WHERE id = v_row.id;
  ASSERT v_n = 1, 'owner cannot read their own redemption';

  -- 2d. A second active copy is refused.
  PERFORM pg_temp.expect_error(format('SELECT public.redeem_coupon(%L, %L)', v_coupon, v_branch),
                               'ALREADY_IN_WALLET');

  -- 2e. Un-claiming / rewriting the row directly is refused.
  PERFORM pg_temp.expect_denied(format(
    'UPDATE user_redemptions SET expires_at = NULL WHERE id = %L', v_row.id));
  PERFORM pg_temp.expect_denied(format(
    'DELETE FROM user_redemptions WHERE id = %L', v_row.id));
  RESET ROLE;

  -- 2f. Another user can neither see nor claim it.
  PERFORM pg_temp.act_as(u2);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_n FROM user_redemptions WHERE id = v_row.id;
  ASSERT v_n = 0, 'another user can read the redemption';
  PERFORM pg_temp.expect_error(format('SELECT public.claim_my_redemption(%L)', v_row.id),
                               'REDEMPTION_NOT_FOUND');
  RESET ROLE;

  -- 2g. The owner claims it once; a second claim is refused; it never flips back.
  PERFORM pg_temp.act_as(u1);
  SET LOCAL ROLE authenticated;
  SELECT * INTO v_row FROM public.claim_my_redemption(v_row.id);
  ASSERT v_row.is_claimed = true, 'claim_my_redemption did not claim';
  PERFORM pg_temp.expect_error(format('SELECT public.claim_my_redemption(%L)', v_row.id),
                               'ALREADY_CLAIMED');
  PERFORM pg_temp.expect_denied(format(
    'UPDATE user_redemptions SET is_claimed = false WHERE id = %L', v_row.id));
  RESET ROLE;

  -- 2h. Per-user cap counts claimed rows too.
  UPDATE coupons SET max_redemptions_per_user = 1 WHERE id = v_coupon;
  PERFORM pg_temp.act_as(u1);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT public.redeem_coupon(%L, %L)', v_coupon, v_branch),
                               'PER_USER_LIMIT_REACHED');
  RESET ROLE;
  UPDATE coupons SET max_redemptions_per_user = NULL WHERE id = v_coupon;

  -- 2i. Global cap.
  UPDATE coupons SET max_redemptions_global = current_redemptions WHERE id = v_coupon;
  PERFORM pg_temp.act_as(u2);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT public.redeem_coupon(%L, %L)', v_coupon, v_branch),
                               'COUPON_LIMIT_REACHED');
  RESET ROLE;
  UPDATE coupons SET max_redemptions_global = NULL WHERE id = v_coupon;

  -- 2j. Draft, archived and not-yet-started coupons are "not found".
  UPDATE coupons SET status = 'draft' WHERE id = v_coupon;
  PERFORM pg_temp.act_as(u2);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT public.redeem_coupon(%L, %L)', v_coupon, v_branch),
                               'COUPON_NOT_FOUND');
  RESET ROLE;
  UPDATE coupons SET status = 'published', start_date = now() + interval '1 day' WHERE id = v_coupon;
  PERFORM pg_temp.act_as(u2);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT public.redeem_coupon(%L, %L)', v_coupon, v_branch),
                               'COUPON_NOT_FOUND');
  RESET ROLE;
  UPDATE coupons SET start_date = now() - interval '1 day', archived_at = now() WHERE id = v_coupon;
  PERFORM pg_temp.act_as(u2);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT public.redeem_coupon(%L, %L)', v_coupon, v_branch),
                               'COUPON_NOT_FOUND');
  RESET ROLE;
  UPDATE coupons SET archived_at = NULL WHERE id = v_coupon;

  -- 2k. Expired.
  UPDATE coupons SET expiry_date = now() - interval '1 minute' WHERE id = v_coupon;
  PERFORM pg_temp.act_as(u2);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT public.redeem_coupon(%L, %L)', v_coupon, v_branch),
                               'COUPON_EXPIRED');
  RESET ROLE;
  UPDATE coupons SET expiry_date = now() + interval '7 days' WHERE id = v_coupon;

  -- 2l. A branch of another business, or the wrong branch for a scoped coupon.
  PERFORM pg_temp.act_as(u2);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT public.redeem_coupon(%L, %L)', v_coupon, v_other_branch),
                               'BRANCH_MISMATCH');
  RESET ROLE;

  -- 2m. Follow-gated coupon without a follow.
  UPDATE coupons SET requires_follow = true WHERE id = v_coupon;
  DELETE FROM follows WHERE user_id = u2 AND business_id = v_biz;
  PERFORM pg_temp.act_as(u2);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT public.redeem_coupon(%L, %L)', v_coupon, v_branch),
                               'FOLLOW_REQUIRED');
  RESET ROLE;
  UPDATE coupons SET requires_follow = false WHERE id = v_coupon;

  -- 2n. No session.
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT public.redeem_coupon(%L, %L)', v_coupon, v_branch),
                               'UNAUTHENTICATED');
  RESET ROLE;

  -- 2o. An expired redemption can't be claimed.
  PERFORM pg_temp.act_as(u2);
  SET LOCAL ROLE authenticated;
  SELECT * INTO v_row FROM public.redeem_coupon(v_coupon, v_branch);
  RESET ROLE;
  UPDATE user_redemptions SET expires_at = now() - interval '1 minute' WHERE id = v_row.id;
  PERFORM pg_temp.act_as(u2);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT public.claim_my_redemption(%L)', v_row.id),
                               'REDEMPTION_EXPIRED');
  RESET ROLE;

  RAISE NOTICE '2 ok: redeem / claim behaviour';
END $$;

-- 3. bida_of_the_day / view_count_history: closed to everyone but admins and
-- the service role; the public RPC still resolves the pick.
DO $$
DECLARE
  u1 uuid;
  v_admin uuid;
  v_biz uuid;
  v_prod uuid;
  v_n int;
BEGIN
  SELECT p.id INTO u1 FROM profiles p WHERE p.role = 'app_user' ORDER BY p.id LIMIT 1;
  ASSERT u1 IS NOT NULL, 'fixture: need a non-admin profile';
  SELECT p.id INTO v_admin FROM profiles p WHERE p.role = 'admin' ORDER BY p.id LIMIT 1;

  SELECT pr.id, pr.business_id INTO v_prod, v_biz
    FROM products pr JOIN businesses b ON b.id = pr.business_id
   WHERE b.status = 'verified' AND b.archived_at IS NULL AND pr.archived_at IS NULL
   LIMIT 1;
  ASSERT v_prod IS NOT NULL, 'fixture: need a product on a verified business';

  -- A non-admin can't write the daily pick, and sees none.
  PERFORM pg_temp.act_as(u1);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_denied(format(
    'INSERT INTO bida_of_the_day (pick_date, business_id, product_id) VALUES (CURRENT_DATE + 400, %L, %L)',
    v_biz, v_prod));
  SELECT count(*) INTO v_n FROM bida_of_the_day;
  ASSERT v_n = 0, 'a non-admin can read bida_of_the_day rows';
  PERFORM pg_temp.expect_denied('SELECT count(*) FROM view_count_history');
  RESET ROLE;

  -- anon is refused outright.
  SET LOCAL ROLE anon;
  PERFORM pg_temp.expect_denied('SELECT count(*) FROM bida_of_the_day');
  PERFORM pg_temp.expect_denied('SELECT count(*) FROM view_count_history');
  RESET ROLE;

  -- An admin still manages picks (the admin screen uses the cookie client).
  IF v_admin IS NOT NULL THEN
    PERFORM pg_temp.act_as(v_admin);
    SET LOCAL ROLE authenticated;
    INSERT INTO bida_of_the_day (pick_date, business_id, product_id)
    VALUES (CURRENT_DATE + 400, v_biz, v_prod);
    SELECT count(*) INTO v_n FROM bida_of_the_day WHERE pick_date = CURRENT_DATE + 400;
    ASSERT v_n = 1, 'admin cannot read back the pick they wrote';
    RESET ROLE;
  ELSE
    RAISE NOTICE '3 skip: no admin profile in this database, admin write path untested';
  END IF;

  -- The public feed RPC is SECURITY DEFINER and keeps working for anon.
  SET LOCAL ROLE anon;
  PERFORM * FROM public.bida_of_the_day(10.72, 122.56);
  RESET ROLE;

  RAISE NOTICE '3 ok: bida_of_the_day / view_count_history locked down';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL REDEMPTION LOCKDOWN TESTS PASSED'; END $$;

ROLLBACK;
