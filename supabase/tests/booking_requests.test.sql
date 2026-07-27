-- Behavioral tests for migration 20260727000005 (phase 4: booking requests).
--
-- Covers the gate matrix on request_booking, the owner/customer authorization
-- split on decide_booking / cancel_booking, and the availability guard.
-- Non-destructive: everything runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/booking_requests.test.sql
--
-- Expected tail: "ALL BOOKING TESTS PASSED".

BEGIN;

-- Impersonation helper: request_booking reads auth.uid(), which resolves from
-- the request.jwt.claims GUC.
CREATE OR REPLACE FUNCTION pg_temp.act_as(p_user UUID) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', p_user::text, 'role', 'authenticated')::text,
                     true);
END $$;

DO $$
DECLARE
  v_biz     UUID;
  v_owner   UUID;
  v_cust    UUID;
  v_cust2   UUID;
  v_branch  UUID;
  v_other_b UUID;
  v_prod    UUID;
  v_walkin  UUID;
  v_booking public.booking_requests;
  v_start   TIMESTAMPTZ := now() + interval '7 days';
  v_end     TIMESTAMPTZ := now() + interval '9 days';
  v_failed  BOOLEAN;
  v_count   INTEGER;
BEGIN
  SELECT id, owner_id INTO v_biz, v_owner
    FROM businesses WHERE status = 'verified' AND archived_at IS NULL LIMIT 1;
  -- Must be non-admin: is_admin() would legitimately let an admin decide any
  -- booking, which would mask the authorization assertions below.
  SELECT id INTO v_cust  FROM profiles
   WHERE role = 'app_user' AND id <> v_owner LIMIT 1;
  SELECT id INTO v_cust2 FROM profiles
   WHERE role = 'app_user' AND id NOT IN (v_owner, v_cust) LIMIT 1;
  SELECT id INTO v_branch FROM branches WHERE business_id = v_biz LIMIT 1;
  SELECT id INTO v_other_b FROM branches WHERE business_id <> v_biz LIMIT 1;
  ASSERT v_biz IS NOT NULL AND v_cust IS NOT NULL AND v_cust2 IS NOT NULL,
    'fixtures missing: need a verified business and two profiles';

  -- One bookable rental with a single unit, and one unbookable retail row.
  INSERT INTO products (business_id, name, price, price_type, kind, booking_mode,
                        inventory_count, capacity, status)
  VALUES (v_biz, 'RT Van', 3500, 'per_day', 'service', 'date_range', 1, 12, 'active')
  RETURNING id INTO v_prod;

  INSERT INTO products (business_id, name, price, price_type, status)
  VALUES (v_biz, 'RT Coffee', 185, 'fixed', 'active')
  RETURNING id INTO v_walkin;

  PERFORM pg_temp.act_as(v_cust);

  -- ─────────────────── the feature ships dark ─────────────────────────────
  v_failed := FALSE;
  BEGIN
    PERFORM request_booking(v_prod, v_start, v_end);
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'bookings were accepted while the enable_bookings flag was off';

  UPDATE app_settings SET value = 'true'::jsonb WHERE key = 'enable_bookings';

  -- ─────────────────── gate matrix ────────────────────────────────────────

  -- A walk-in offering (booking_mode 'none') is not bookable.
  v_failed := FALSE;
  BEGIN
    PERFORM request_booking(v_walkin, v_start, v_end);
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'a booking_mode=none offering accepted a booking';

  -- The past is not bookable.
  v_failed := FALSE;
  BEGIN
    PERFORM request_booking(v_prod, now() - interval '1 day', now() + interval '1 day');
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'a booking starting in the past was accepted';

  -- End must follow start.
  v_failed := FALSE;
  BEGIN
    PERFORM request_booking(v_prod, v_end, v_start);
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'an inverted date range was accepted';

  -- Party size cannot exceed capacity.
  v_failed := FALSE;
  BEGIN
    PERFORM request_booking(v_prod, v_start, v_end, NULL, 99);
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'a party larger than capacity was accepted';

  -- A branch belonging to another business is not a valid location.
  IF v_other_b IS NOT NULL THEN
    v_failed := FALSE;
    BEGIN
      PERFORM request_booking(v_prod, v_start, v_end, v_other_b);
    EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
    END;
    ASSERT v_failed, 'a cross-business branch was accepted';
  END IF;

  -- ─────────────────── happy path ─────────────────────────────────────────
  v_booking := request_booking(v_prod, v_start, v_end, v_branch, 4, '  need a child seat  ');
  ASSERT v_booking.status = 'pending', 'a new booking should start pending';
  ASSERT v_booking.user_id = v_cust, 'booking was attributed to the wrong user';
  ASSERT v_booking.notes = 'need a child seat', 'notes were not trimmed';

  -- The owner was notified.
  SELECT count(*) INTO v_count FROM notifications
   WHERE user_id = v_owner AND type = 'booking_requested'
     AND metadata->>'booking_id' = v_booking.id::text;
  ASSERT v_count = 1, 'the owner was not notified of the request';

  -- ─────────────────── availability ───────────────────────────────────────
  -- inventory_count is 1 and the window overlaps, so a second customer fails.
  PERFORM pg_temp.act_as(v_cust2);
  v_failed := FALSE;
  BEGIN
    PERFORM request_booking(v_prod, v_start + interval '1 day', v_end + interval '1 day');
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'the single available unit was double-booked';

  -- A non-overlapping window is fine.
  PERFORM request_booking(v_prod, v_start + interval '30 days', v_end + interval '30 days');

  -- ─────────────────── authorization ──────────────────────────────────────
  -- A customer cannot decide their own booking.
  PERFORM pg_temp.act_as(v_cust);
  v_failed := FALSE;
  BEGIN
    PERFORM decide_booking(v_booking.id, 'confirmed');
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'a customer confirmed their own booking';

  -- A stranger cannot cancel someone else''s booking.
  PERFORM pg_temp.act_as(v_cust2);
  v_failed := FALSE;
  BEGIN
    PERFORM cancel_booking(v_booking.id);
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'a stranger cancelled another user''s booking';

  -- The owner confirms, and the customer is notified.
  PERFORM pg_temp.act_as(v_owner);
  v_booking := decide_booking(v_booking.id, 'confirmed', 'See you then', 3500);
  ASSERT v_booking.status = 'confirmed', 'the owner could not confirm';
  ASSERT v_booking.decided_at IS NOT NULL, 'decided_at was not stamped';

  SELECT count(*) INTO v_count FROM notifications
   WHERE user_id = v_cust AND type = 'booking_confirmed'
     AND metadata->>'booking_id' = v_booking.id::text;
  ASSERT v_count = 1, 'the customer was not notified of the confirmation';

  -- Re-deciding a decided booking is refused.
  v_failed := FALSE;
  BEGIN
    PERFORM decide_booking(v_booking.id, 'declined');
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'an already-decided booking was decided again';

  -- An invalid decision value is refused.
  v_failed := FALSE;
  BEGIN
    PERFORM decide_booking(v_booking.id, 'pending');
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'an invalid decision was accepted';

  -- ─────────────────── cancellation ───────────────────────────────────────
  PERFORM pg_temp.act_as(v_cust);
  v_booking := cancel_booking(v_booking.id);
  ASSERT v_booking.status = 'cancelled', 'the customer could not cancel';

  -- A cancelled booking cannot be confirmed out from under the customer.
  PERFORM pg_temp.act_as(v_owner);
  v_failed := FALSE;
  BEGIN
    PERFORM decide_booking(v_booking.id, 'confirmed');
  EXCEPTION WHEN OTHERS THEN v_failed := TRUE;
  END;
  ASSERT v_failed, 'a cancelled booking was confirmed';

  -- Cancelling frees the slot for someone else.
  PERFORM pg_temp.act_as(v_cust2);
  PERFORM request_booking(v_prod, v_start, v_end);

  -- ─────────────────── direct writes are denied ───────────────────────────
  -- No INSERT policy exists: the RPC is the only insert path.
  SELECT count(*) INTO v_count FROM pg_policies
   WHERE tablename = 'booking_requests' AND cmd = 'INSERT';
  ASSERT v_count = 0, 'an INSERT policy exists — the RPC is no longer the only path';

  -- Every policy wraps its auth calls (perf standard P1: a bare auth.uid()
  -- re-evaluates per row scanned). Postgres has no regex lookbehind, so this
  -- counts occurrences instead: every `auth.uid()` must be a `SELECT
  -- auth.uid()`. pg_policies renders the wrapped form as "( SELECT auth.uid()
  -- AS uid)", so the comparison is on the normalized text.
  SELECT sum(
           (length(expr) - length(replace(expr, 'auth.uid()', ''))) / 10
           - (length(expr) - length(replace(expr, 'SELECT auth.uid()', ''))) / 17
         )
    INTO v_count
    FROM pg_policies p,
         LATERAL (VALUES (coalesce(p.qual, '')), (coalesce(p.with_check, ''))) AS e(expr)
   WHERE p.tablename = 'booking_requests';
  ASSERT coalesce(v_count, 0) = 0,
    format('booking policies with a bare auth.uid(): %s', v_count);

  RAISE NOTICE 'ALL BOOKING TESTS PASSED';
END $$;

ROLLBACK;
