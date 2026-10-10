-- Behavioral tests for migration 20261009010000 (privileged business inserts).
--
-- `trg_set_business_initial_status` must gate OWNER inserts (pending, not yet
-- complete — registration finishes through complete_business_registration())
-- while leaving PRIVILEGED inserts exactly as written: seeds and SQL-editor
-- sessions (no JWT), the service role (the directory import), and admin users.
--
-- It used to test only `is_admin()`, believing it true for the service role.
-- It is not — `is_admin()` looks up `auth.uid()`'s profile, and there is no
-- uid without a signed-in user — so every seed and imported listing was forced
-- to `pending` with no completion stamp, which the verified-requires-completion
-- CHECK then made impossible to publish.
--
-- Callers are simulated through `request.jwt.claims`, which is what
-- auth.role() / auth.uid() read. (Not `SET ROLE`: on the local stack a
-- superuser session that switches role and is then denied can crash the
-- backend — see ilokal-web #96.)
--
-- Non-destructive: runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/registration_privileged_insert.test.sql
--
-- Expected tail: "ALL PRIVILEGED INSERT TESTS PASSED".

BEGIN;

CREATE TEMP TABLE probe_result (caller TEXT, status TEXT, completed BOOLEAN);

CREATE FUNCTION pg_temp.probe_insert(p_caller TEXT, p_owner UUID) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_status TEXT;
  v_completed BOOLEAN;
BEGIN
  INSERT INTO public.businesses (owner_id, shop_name, status)
  VALUES (p_owner, 'zz privileged-insert probe ' || p_caller, 'verified')
  RETURNING status, registration_completed_at IS NOT NULL
    INTO v_status, v_completed;
  INSERT INTO probe_result VALUES (p_caller, v_status, v_completed);
END;
$$;

DO $$
DECLARE
  v_owner UUID;
  v_admin UUID;
  r RECORD;
BEGIN
  SELECT id INTO v_owner FROM public.profiles WHERE role = 'business_owner' LIMIT 1;
  SELECT id INTO v_admin FROM public.profiles WHERE role = 'admin' LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'fixture: no business_owner profile to own the probe rows';
  END IF;

  -- 1. Direct session (seeds, SQL editor): no JWT at all.
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM pg_temp.probe_insert('direct', v_owner);

  -- 2. The service role (directory import, scripts).
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  PERFORM pg_temp.probe_insert('service_role', v_owner);

  -- 3. An owner registering through the app: must still be gated.
  PERFORM set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', v_owner)::text, true);
  PERFORM pg_temp.probe_insert('owner', v_owner);

  -- 4. An admin user, when the database has one.
  IF v_admin IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims',
      json_build_object('role', 'authenticated', 'sub', v_admin)::text, true);
    PERFORM pg_temp.probe_insert('admin', v_owner);
  ELSE
    RAISE NOTICE 'no admin profile here — admin case skipped';
  END IF;

  PERFORM set_config('request.jwt.claims', '', true);

  FOR r IN SELECT * FROM probe_result WHERE caller <> 'owner' LOOP
    IF r.status <> 'verified' OR NOT r.completed THEN
      RAISE EXCEPTION 'FAIL: % insert came out % / completed=% — a privileged insert must keep what it wrote',
        r.caller, r.status, r.completed;
    END IF;
  END LOOP;

  SELECT * INTO r FROM probe_result WHERE caller = 'owner';
  IF r.status <> 'pending' OR r.completed THEN
    RAISE EXCEPTION 'FAIL: owner insert came out % / completed=% — an owner must start pending and incomplete',
      r.status, r.completed;
  END IF;

  RAISE NOTICE 'blocks 1-4 passed: privileged inserts kept, owner insert gated';
END;
$$;

-- 5. The helper itself never trusts a public caller.
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  IF public.is_privileged_session() THEN
    RAISE EXCEPTION 'FAIL: anon counted as privileged';
  END IF;

  PERFORM set_config('request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', gen_random_uuid())::text, true);
  IF public.is_privileged_session() THEN
    RAISE EXCEPTION 'FAIL: a signed-in non-admin counted as privileged';
  END IF;

  PERFORM set_config('request.jwt.claims', '', true);
  RAISE NOTICE 'block 5 passed: anon and plain users are not privileged';
  RAISE NOTICE 'ALL PRIVILEGED INSERT TESTS PASSED';
END;
$$;

ROLLBACK;
