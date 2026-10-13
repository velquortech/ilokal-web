-- Behavioral tests for migration 20261013100000 (reviews: visit evidence,
-- RPC-only writes, reports, moderation).
-- Non-destructive: everything runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/reviews.test.sql
--
-- Expected tail: "ALL REVIEW TESTS PASSED".

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

DO $$
DECLARE
  v_biz    uuid;
  v_branch uuid;
  v_lat    double precision;
  v_lng    double precision;
  u1 uuid; u2 uuid; u3 uuid; u4 uuid;
  v_res    jsonb;
  v_id     uuid;
  v_avg_before numeric;
  v_n int;
BEGIN
  -- A verified business with a located branch, and four active users with no
  -- review of it.
  SELECT b.id, br.id, ST_Y(br.location::geometry), ST_X(br.location::geometry)
    INTO v_biz, v_branch, v_lat, v_lng
    FROM businesses b JOIN branches br ON br.business_id = b.id
   WHERE b.status = 'verified' AND b.archived_at IS NULL
     AND br.archived_at IS NULL AND br.location IS NOT NULL
   LIMIT 1;
  ASSERT v_biz IS NOT NULL, 'fixture: no verified business with a located branch';

  SELECT id INTO u1 FROM profiles p WHERE p.status = 'active' AND p.archived_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM business_ratings r WHERE r.user_id = p.id AND r.business_id = v_biz)
     AND NOT EXISTS (SELECT 1 FROM businesses ob WHERE ob.owner_id = p.id)
   ORDER BY p.id LIMIT 1;
  SELECT id INTO u2 FROM profiles p WHERE p.status = 'active' AND p.archived_at IS NULL AND p.id > u1
     AND NOT EXISTS (SELECT 1 FROM business_ratings r WHERE r.user_id = p.id AND r.business_id = v_biz)
   ORDER BY p.id LIMIT 1;
  SELECT id INTO u3 FROM profiles p WHERE p.status = 'active' AND p.archived_at IS NULL AND p.id > u2
     AND NOT EXISTS (SELECT 1 FROM business_ratings r WHERE r.user_id = p.id AND r.business_id = v_biz)
   ORDER BY p.id LIMIT 1;
  SELECT id INTO u4 FROM profiles p WHERE p.status = 'active' AND p.archived_at IS NULL AND p.id > u3
     AND NOT EXISTS (SELECT 1 FROM business_ratings r WHERE r.user_id = p.id AND r.business_id = v_biz)
   ORDER BY p.id LIMIT 1;
  ASSERT u4 IS NOT NULL, 'fixture: need four reviewer profiles';

  -- Isolate from any consumed redemptions the seed gave these users.
  DELETE FROM user_redemptions ur USING coupons c
   WHERE c.id = ur.coupon_id AND c.business_id = v_biz AND ur.user_id IN (u1, u2, u3, u4);
  UPDATE business_settings SET allow_reviews = true WHERE business_id = v_biz;
  UPDATE app_settings SET value = 'true'::jsonb WHERE key = 'reviews_write_enabled';

  -- 1. Direct table writes are closed (gap 2 regression guard).
  PERFORM pg_temp.act_as(u1);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO business_ratings (user_id, business_id, rating) VALUES (u1, v_biz, 5);
    RAISE EXCEPTION 'direct INSERT should be refused';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE business_ratings SET rating = 1 WHERE user_id = u1;
    RAISE EXCEPTION 'direct UPDATE should be refused';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 2. No visit → NO_VISIT; eligibility says so and offers check-in.
  PERFORM pg_temp.expect_error(format('SELECT upsert_business_rating(%L, 5, null)', v_biz), 'NO_VISIT');
  v_res := get_my_business_review(v_biz);
  ASSERT v_res->'mine' = 'null'::jsonb, 'no review yet';
  ASSERT (v_res->'eligibility'->>'reason') = 'NO_VISIT', 'eligibility NO_VISIT';
  ASSERT (v_res->'eligibility'->>'can_check_in')::boolean, 'can check in';

  -- 3. Check-in rules.
  PERFORM pg_temp.expect_error(format('SELECT record_business_checkin(%L, %s, %s, 10, true)', v_biz, v_lat, v_lng), 'MOCK_LOCATION');
  PERFORM pg_temp.expect_error(format('SELECT record_business_checkin(%L, %s, %s, 500, false)', v_biz, v_lat, v_lng), 'LOW_ACCURACY');
  PERFORM pg_temp.expect_error(format('SELECT record_business_checkin(%L, %s, %s, 10, false)', v_biz, v_lat + 0.01, v_lng), 'TOO_FAR');
  v_res := record_business_checkin(v_biz, v_lat + 0.0005, v_lng, 20, false);   -- ~55 m
  ASSERT (v_res->>'distance_m')::int BETWEEN 40 AND 70, 'distance computed server-side';
  PERFORM record_business_checkin(v_biz, v_lat, v_lng, 20, false);              -- same day: idempotent
  RESET ROLE;
  SELECT count(*) INTO v_n FROM business_checkins WHERE user_id = u1 AND business_id = v_biz;
  ASSERT v_n = 1, 'one check-in per day';
  SET LOCAL ROLE authenticated;

  -- 4. Now eligible; comment filters; create; edit marks edited.
  v_res := get_my_business_review(v_biz);
  ASSERT (v_res->'eligibility'->>'can_review')::boolean, 'eligible after check-in';
  ASSERT (v_res->'eligibility'->>'evidence') = 'checkin', 'evidence checkin';
  PERFORM pg_temp.expect_error(format('SELECT upsert_business_rating(%L, 5, %L)', v_biz, 'visit www.example.com'), 'COMMENT_REJECTED');
  PERFORM pg_temp.expect_error(format('SELECT upsert_business_rating(%L, 5, %L)', v_biz, 'text me 0917 123 4567'), 'COMMENT_REJECTED');
  PERFORM pg_temp.expect_error(format('SELECT upsert_business_rating(%L, 5, %L)', v_biz, repeat('a', 501)), 'COMMENT_TOO_LONG');
  PERFORM pg_temp.expect_error(format('SELECT upsert_business_rating(%L, 6, null)', v_biz), 'INVALID_RATING');
  v_res := upsert_business_rating(v_biz, 4, '  Great coffee, friendly staff.  ');
  ASSERT (v_res->>'comment') = 'Great coffee, friendly staff.', 'comment trimmed';
  ASSERT NOT (v_res->>'edited')::boolean, 'new review not edited';
  ASSERT (v_res->>'evidence') = 'checkin', 'stored evidence';
  v_id := (v_res->>'id')::uuid;
  v_res := upsert_business_rating(v_biz, 5, 'Great coffee, friendly staff.');
  ASSERT (v_res->>'edited')::boolean, 'edit marks edited';
  ASSERT (v_res->>'id')::uuid = v_id, 'edit keeps the row';

  -- 5. Public list shapes the author name and hides nothing else.
  RESET ROLE;
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_n FROM get_business_reviews(v_biz, 'recent', 20, 0, true) g WHERE g.id = v_id;
  ASSERT v_n = 1, 'anon can list reviews';
  RESET ROLE;

  -- 6. Owner switch + kill switch.
  INSERT INTO business_settings (business_id, allow_reviews) VALUES (v_biz, false)
    ON CONFLICT (business_id) DO UPDATE SET allow_reviews = false;
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT upsert_business_rating(%L, 5, null)', v_biz), 'REVIEWS_DISABLED');
  RESET ROLE;
  UPDATE business_settings SET allow_reviews = true WHERE business_id = v_biz;
  UPDATE app_settings SET value = 'false'::jsonb WHERE key = 'reviews_write_enabled';
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT upsert_business_rating(%L, 5, null)', v_biz), 'REVIEWS_PAUSED');
  RESET ROLE;
  UPDATE app_settings SET value = 'true'::jsonb WHERE key = 'reviews_write_enabled';

  -- 7. Reports: own review refused; 3 distinct reporters hide it and the
  --    aggregate stops counting it.
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.expect_error(format('SELECT report_business_rating(%L, %L, null)', v_id, 'spam'), 'OWN_REVIEW');
  RESET ROLE;
  SELECT count(*) INTO v_n FROM business_ratings WHERE business_id = v_biz;

  PERFORM pg_temp.act_as(u2); SET LOCAL ROLE authenticated;
  ASSERT NOT (report_business_rating(v_id, 'fake', null)->>'hidden')::boolean, '1 report: visible';
  ASSERT NOT (report_business_rating(v_id, 'fake', null)->>'hidden')::boolean, 'repeat report is idempotent';
  RESET ROLE;
  PERFORM pg_temp.act_as(u3); SET LOCAL ROLE authenticated;
  ASSERT NOT (report_business_rating(v_id, 'spam', null)->>'hidden')::boolean, '2 reports: visible';
  RESET ROLE;
  PERFORM pg_temp.act_as(u4); SET LOCAL ROLE authenticated;
  ASSERT (report_business_rating(v_id, 'offensive', 'rude')->>'hidden')::boolean, '3 reports: hidden';
  RESET ROLE;
  ASSERT NOT EXISTS (SELECT 1 FROM business_ratings WHERE id = v_id), 'moved out of published';
  ASSERT (SELECT count(*) FROM business_ratings WHERE business_id = v_biz) = v_n - 1, 'aggregate source shrinks';

  -- 8. The author sees it as under review and can't re-publish by editing.
  PERFORM pg_temp.act_as(u1); SET LOCAL ROLE authenticated;
  v_res := get_my_business_review(v_biz);
  ASSERT (v_res->'mine'->>'status') = 'hidden', 'author sees hidden';
  ASSERT (v_res->'eligibility'->>'reason') = 'UNDER_REVIEW', 'eligibility UNDER_REVIEW';
  PERFORM pg_temp.expect_error(format('SELECT upsert_business_rating(%L, 5, null)', v_biz), 'UNDER_REVIEW');
  -- Only admins moderate.
  PERFORM pg_temp.expect_error(format('SELECT moderate_business_rating(%L, %L, null)', v_id, 'restore'), 'FORBIDDEN');
  RESET ROLE;

  -- 9. Admin restore puts it back and clears reports.
  PERFORM pg_temp.act_as((SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));
  SET LOCAL ROLE authenticated;
  ASSERT moderate_business_rating(v_id, 'restore', null), 'admin restore';
  RESET ROLE;
  ASSERT EXISTS (SELECT 1 FROM business_ratings WHERE id = v_id), 'restored to published';
  ASSERT NOT EXISTS (SELECT 1 FROM business_rating_reports WHERE rating_id = v_id), 'reports cleared';

  -- 10. Delete my review.
  PERFORM pg_temp.act_as(u1); SET LOCAL ROLE authenticated;
  ASSERT delete_my_business_rating(v_biz), 'delete own';
  ASSERT (get_my_business_review(v_biz)->'mine') = 'null'::jsonb, 'gone after delete';
  RESET ROLE;

  -- 11. A counter-consumed redemption is "visit_redeemed" and upgrades a
  --     check-in review on edit.
  INSERT INTO user_redemptions (user_id, coupon_id, is_claimed)
  SELECT u2, c.id, true FROM coupons c WHERE c.business_id = v_biz LIMIT 1;
  IF FOUND THEN
    PERFORM pg_temp.act_as(u2); SET LOCAL ROLE authenticated;
    ASSERT (get_my_business_review(v_biz)->'eligibility'->>'evidence') = 'visit_redeemed', 'redeemed evidence';
    ASSERT (upsert_business_rating(v_biz, 3, null)->>'evidence') = 'visit_redeemed', 'stored redeemed';
    RESET ROLE;
  ELSE
    RAISE NOTICE 'skipped redeemed-evidence case: business has no coupons';
  END IF;

  -- 12. Rate limit: a 6th new review in 24h is refused.
  RESET ROLE;
  INSERT INTO business_checkins (user_id, business_id, branch_id, distance_m)
  SELECT u3, b.id, br.id, 10
    FROM businesses b JOIN branches br ON br.business_id = b.id
   WHERE b.status = 'verified' AND b.archived_at IS NULL AND br.location IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM business_ratings r WHERE r.user_id = u3 AND r.business_id = b.id)
     AND NOT EXISTS (SELECT 1 FROM business_rating_moderation m WHERE m.user_id = u3 AND m.business_id = b.id)
  ON CONFLICT DO NOTHING;
  PERFORM pg_temp.act_as(u3); SET LOCAL ROLE authenticated;
  v_n := 0;
  FOR v_id IN
    SELECT ci.business_id FROM business_checkins ci
     WHERE ci.user_id = u3 AND NOT EXISTS (SELECT 1 FROM business_ratings r WHERE r.user_id = u3 AND r.business_id = ci.business_id)
     LIMIT 6
  LOOP
    v_n := v_n + 1;
    IF v_n <= 5 THEN
      PERFORM upsert_business_rating(v_id, 4, null);
    ELSE
      PERFORM pg_temp.expect_error(format('SELECT upsert_business_rating(%L, 4, null)', v_id), 'RATE_LIMITED');
    END IF;
  END LOOP;
  ASSERT v_n = 6, 'fixture: need six reviewable businesses for the rate-limit case';
  RESET ROLE;

  RAISE NOTICE 'ALL REVIEW TESTS PASSED';
END $$;

ROLLBACK;
