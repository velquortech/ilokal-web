-- Behavioral tests for migration 20260804233000 (onboarding state columns).
--
-- Two nullable timestamps on `business_settings` replace a per-device
-- localStorage marker. The migration adds no policy and no index on purpose,
-- so what has to be proven is that the EXISTING guarantees still hold with two
-- more columns on the table: the owner policy still covers writes (a `FOR ALL`
-- policy silently reuses `USING` for writes — the PR #18 lesson), the public
-- RPC still exposes exactly four columns and none of them is new, and anon
-- still cannot read the table at all. Non-destructive (rolled back).
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/onboarding_state.test.sql
--
-- Expected tail: "ALL ONBOARDING STATE TESTS PASSED".

BEGIN;

DO $$
DECLARE
  v_business   UUID;
  v_owner      UUID;
  v_stranger   UUID;
  v_count      INTEGER;
  v_stamp      TIMESTAMPTZ;
  v_nullable   TEXT;
  v_type       TEXT;
  v_visible    INTEGER;
BEGIN
  SELECT b.id, b.owner_id INTO v_business, v_owner
    FROM businesses b
   WHERE b.owner_id IS NOT NULL AND b.archived_at IS NULL
   LIMIT 1;
  ASSERT v_business IS NOT NULL, 'fixture missing: no owned business';

  SELECT id INTO v_stranger FROM auth.users WHERE id <> v_owner LIMIT 1;
  ASSERT v_stranger IS NOT NULL, 'fixture missing: no second user';

  -- ─────────────────── the columns exist, and are optional ────────────────
  -- Nullable with no default is the whole model: NULL means "not answered".
  -- A NOT NULL default would have claimed every existing shop had answered.
  FOR v_nullable, v_type IN
    SELECT is_nullable, data_type FROM information_schema.columns
     WHERE table_name = 'business_settings'
       AND column_name IN (
         'onboarding_tour_completed_at',
         'onboarding_checklist_dismissed_at'
       )
  LOOP
    ASSERT v_nullable = 'YES', 'onboarding column is NOT NULL';
    ASSERT v_type = 'timestamp with time zone',
      format('onboarding column has the wrong type: %s', v_type);
  END LOOP;

  SELECT count(*) INTO v_count FROM information_schema.columns
   WHERE table_name = 'business_settings'
     AND column_name IN (
       'onboarding_tour_completed_at',
       'onboarding_checklist_dismissed_at'
     );
  ASSERT v_count = 2, format('expected both onboarding columns, found %s', v_count);

  SELECT count(*) INTO v_count FROM information_schema.columns
   WHERE table_name = 'business_settings'
     AND column_name LIKE 'onboarding%'
     AND column_default IS NOT NULL;
  ASSERT v_count = 0, 'an onboarding column carries a default — NULL must mean "not answered"';

  -- ─────────────────── no new policy was needed, or added ─────────────────
  SELECT count(*) INTO v_count FROM pg_policies
   WHERE tablename = 'business_settings';
  ASSERT v_count = 1,
    format('business_settings should still have exactly one policy, found %s', v_count);

  -- The `FOR ALL` policy must carry an EXPLICIT WITH CHECK: without one
  -- Postgres reuses USING for writes, which is how `booking_requests` lost its
  -- owner UPDATE policy.
  SELECT count(*) INTO v_count FROM pg_policy
   WHERE polrelid = 'public.business_settings'::regclass
     AND polwithcheck IS NOT NULL;
  ASSERT v_count = 1, 'the owner policy has no explicit WITH CHECK';

  -- ─────────────────── the owner can record an answer ─────────────────────
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  INSERT INTO business_settings (business_id, onboarding_tour_completed_at)
  VALUES (v_business, now())
  ON CONFLICT (business_id) DO UPDATE
    SET onboarding_tour_completed_at = EXCLUDED.onboarding_tour_completed_at;

  SELECT onboarding_tour_completed_at INTO v_stamp
    FROM business_settings WHERE business_id = v_business;

  RESET ROLE;
  ASSERT v_stamp IS NOT NULL, 'the owner could not record a tour answer';

  -- ─────────────────── a stranger cannot answer for them ──────────────────
  -- The onboarding state is per SHOP; another signed-in user must not be able
  -- to silence a shop's checklist.
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_stranger, 'role', 'authenticated')::text,
    true
  );
  SET LOCAL ROLE authenticated;

  UPDATE business_settings
     SET onboarding_checklist_dismissed_at = now()
   WHERE business_id = v_business;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- A stranger also cannot see the row at all.
  SELECT count(*) INTO v_visible FROM business_settings
   WHERE business_id = v_business;

  RESET ROLE;
  ASSERT v_count = 0, 'a stranger updated another shop''s onboarding state';
  ASSERT v_visible = 0, 'a stranger can read another shop''s onboarding state';

  SELECT onboarding_checklist_dismissed_at INTO v_stamp
    FROM business_settings WHERE business_id = v_business;
  ASSERT v_stamp IS NULL, 'a stranger''s dismissal landed on another shop';

  -- ─────────────────── nothing new leaks publicly ─────────────────────────
  -- `get_business_public_info` returns an EXPLICIT column list, so a new column
  -- on this table is private by default. Asserted rather than assumed.
  SELECT count(*) INTO v_count
    FROM information_schema.parameters p
    JOIN information_schema.routines r ON p.specific_name = r.specific_name
   WHERE r.routine_name = 'get_business_public_info'
     AND p.parameter_mode = 'OUT';
  ASSERT v_count = 4,
    format('the public RPC no longer returns exactly 4 columns (found %s)', v_count);

  SELECT count(*) INTO v_count
    FROM information_schema.parameters p
    JOIN information_schema.routines r ON p.specific_name = r.specific_name
   WHERE r.routine_name = 'get_business_public_info'
     AND p.parameter_mode = 'OUT'
     AND p.parameter_name LIKE 'onboarding%';
  ASSERT v_count = 0, 'the public RPC exposes an onboarding column';

  SELECT count(*) INTO v_count FROM pg_policies
   WHERE tablename = 'business_settings' AND roles::text[] && ARRAY['anon'];
  ASSERT v_count = 0, 'business_settings gained an anon-readable policy';

  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_count FROM business_settings;
  RESET ROLE;
  ASSERT v_count = 0, 'anon can read business_settings directly';

  RAISE NOTICE 'ALL ONBOARDING STATE TESTS PASSED';
END $$;

ROLLBACK;
