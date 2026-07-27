-- Behavioral tests for migration 20260727000006 (get_business_public_info).
--
-- The point of this RPC is CONTROLLED exposure: it opens four columns of an
-- owner-only table to anon. These tests pin exactly what leaks and what does
-- not. Non-destructive (rolled back).
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/business_public_info.test.sql
--
-- Expected tail: "ALL PUBLIC INFO TESTS PASSED".

BEGIN;

DO $$
DECLARE
  v_verified  UUID;
  v_hidden    UUID;
  v_row       RECORD;
  v_count     INTEGER;
  v_failed    BOOLEAN;
BEGIN
  SELECT id INTO v_verified
    FROM businesses WHERE status = 'verified' AND archived_at IS NULL LIMIT 1;
  SELECT id INTO v_hidden
    FROM businesses WHERE status <> 'verified' OR archived_at IS NOT NULL LIMIT 1;
  ASSERT v_verified IS NOT NULL, 'fixture missing: no verified business';

  INSERT INTO business_settings (
    business_id, operating_hours, social_links,
    contact_website, contact_phone_public, allow_reviews,
    coupon_default_expiry_days
  ) VALUES (
    v_verified,
    '{"mon":{"open":"09:00","close":"18:00","closed":false}}'::jsonb,
    '{"facebook":"https://facebook.com/shop"}'::jsonb,
    'https://ilokal.shop', '+63 917 123 4567', false, 14
  )
  ON CONFLICT (business_id) DO UPDATE
    SET operating_hours = EXCLUDED.operating_hours,
        social_links    = EXCLUDED.social_links,
        contact_website = EXCLUDED.contact_website,
        contact_phone_public = EXCLUDED.contact_phone_public;

  -- ─────────────────── the four public fields come back ───────────────────
  SELECT * INTO v_row FROM get_business_public_info(v_verified);
  ASSERT FOUND, 'no row returned for a verified business';
  ASSERT v_row.contact_website = 'https://ilokal.shop', 'website not returned';
  ASSERT v_row.contact_phone_public = '+63 917 123 4567', 'phone not returned';
  ASSERT v_row.operating_hours ->> 'mon' IS NOT NULL, 'hours not returned';
  ASSERT v_row.social_links ->> 'facebook' IS NOT NULL, 'social links not returned';

  -- ─────────────────── the private fields are NOT exposed ─────────────────
  -- The return type is the contract; a future column added to the table must
  -- stay private unless someone deliberately widens this signature.
  SELECT count(*) INTO v_count
    FROM information_schema.routines r
    JOIN information_schema.parameters p
      ON p.specific_name = r.specific_name
   WHERE r.routine_name = 'get_business_public_info'
     AND p.parameter_mode = 'OUT'
     AND p.parameter_name IN ('allow_reviews', 'coupon_default_expiry_days');
  ASSERT v_count = 0,
    'the RPC exposes internal settings columns (allow_reviews / coupon_default_expiry_days)';

  SELECT count(*) INTO v_count
    FROM information_schema.parameters p
    JOIN information_schema.routines r ON p.specific_name = r.specific_name
   WHERE r.routine_name = 'get_business_public_info'
     AND p.parameter_mode = 'OUT';
  ASSERT v_count = 4, format('expected exactly 4 public columns, found %s', v_count);

  -- ─────────────────── hidden businesses return nothing ───────────────────
  IF v_hidden IS NOT NULL THEN
    INSERT INTO business_settings (business_id, contact_phone_public)
    VALUES (v_hidden, '+63 900 000 0000')
    ON CONFLICT (business_id) DO UPDATE
      SET contact_phone_public = EXCLUDED.contact_phone_public;

    SELECT count(*) INTO v_count FROM get_business_public_info(v_hidden);
    ASSERT v_count = 0,
      'an unverified/archived business leaked its contact details';
  END IF;

  -- A business with no settings row is simply empty, not an error.
  SELECT count(*) INTO v_count
    FROM get_business_public_info('00000000-0000-0000-0000-000000000000');
  ASSERT v_count = 0, 'unknown business id did not return zero rows';

  -- ─────────────────── the table itself stays private ─────────────────────
  SELECT count(*) INTO v_count FROM pg_policies
   WHERE tablename = 'business_settings' AND cmd IN ('SELECT', 'ALL')
     AND roles::text[] && ARRAY['anon'];
  ASSERT v_count = 0,
    'business_settings gained an anon-readable policy — the RPC exists to avoid exactly that';

  -- Direct reads as anon must still be denied by RLS.
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_count FROM business_settings;
  RESET ROLE;
  ASSERT v_count = 0, 'anon can read business_settings directly';

  -- ...while the RPC still works for anon.
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_count FROM get_business_public_info(v_verified);
  RESET ROLE;
  ASSERT v_count = 1, 'anon cannot execute the public info RPC';

  RAISE NOTICE 'ALL PUBLIC INFO TESTS PASSED';
END $$;

ROLLBACK;
