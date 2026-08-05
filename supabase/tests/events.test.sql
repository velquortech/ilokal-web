-- Behavioral tests for migration 20260802034107 (events).
--
-- The design claim these defend: an event is a PUBLISHING surface. A business
-- owner may propose one, but only an admin decides whether it appears on the
-- front page — so the owner must never be able to reach `approved`, by any
-- route, including editing a row that was already approved. Everything else
-- here guards the blast radius of getting that wrong: cross-shop promotion,
-- `javascript:` links, and an admin-notification RPC that a stranger could
-- otherwise drive.
--
-- Non-destructive: everything runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/events.test.sql
--
-- Expected tail: "ALL EVENT TESTS PASSED".

BEGIN;

-- Impersonation helper: the policies and triggers read auth.uid(), which
-- resolves from the request.jwt.claims GUC.
CREATE OR REPLACE FUNCTION pg_temp.act_as(p_user UUID) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', p_user::text, 'role', 'authenticated')::text,
                     true);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.act_as_anon() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
                     json_build_object('role', 'anon')::text, true);
END $$;

-- ============================================================
-- 1. The approval gate — an owner can never reach `approved`
-- ============================================================
DO $$
DECLARE
  v_biz     UUID;
  v_owner   UUID;
  v_event   UUID;
  v_status  TEXT;
  v_prio    SMALLINT;
  v_note    TEXT;
BEGIN
  SELECT b.id, b.owner_id INTO v_biz, v_owner
  FROM public.businesses b
  WHERE b.status = 'verified' AND b.archived_at IS NULL
  LIMIT 1;
  ASSERT v_biz IS NOT NULL, 'fixture: no verified business in the database';

  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;

  -- Asking for `approved` on INSERT.
  INSERT INTO public.events (business_id, name, address, starts_at, ends_at, status, priority)
  VALUES (v_biz, 'Gate: insert as approved', 'Iznart St',
          now() + interval '2 days', now() + interval '3 days', 'approved', 99)
  RETURNING id INTO v_event;

  SELECT status, priority INTO v_status, v_prio FROM public.events WHERE id = v_event;
  ASSERT v_status = 'pending_review',
    'an owner inserting status=approved must land as pending_review, got ' || v_status;
  ASSERT v_prio = 0,
    'banner priority is the platform''s call — an owner must not set it, got ' || v_prio;

  -- Asking for `approved` on UPDATE.
  UPDATE public.events SET status = 'approved' WHERE id = v_event;
  SELECT status INTO v_status FROM public.events WHERE id = v_event;
  ASSERT v_status = 'pending_review',
    'an owner updating to approved must be reverted, got ' || v_status;

  -- Writing the reviewer's own columns.
  UPDATE public.events
     SET review_note = 'I approve myself', reviewed_by = v_owner, reviewed_at = now(), priority = 50
   WHERE id = v_event;
  SELECT review_note, priority INTO v_note, v_prio FROM public.events WHERE id = v_event;
  ASSERT v_note IS NULL, 'review_note is the reviewer''s record; an owner must not write it';
  ASSERT v_prio = 0, 'priority must stay 0 for a non-admin';

  -- Withdrawing to draft and resubmitting IS the owner's to do.
  UPDATE public.events SET status = 'draft' WHERE id = v_event;
  SELECT status INTO v_status FROM public.events WHERE id = v_event;
  ASSERT v_status = 'draft', 'an owner may withdraw their own proposal, got ' || v_status;

  UPDATE public.events SET status = 'pending_review' WHERE id = v_event;
  SELECT status INTO v_status FROM public.events WHERE id = v_event;
  ASSERT v_status = 'pending_review', 'an owner may resubmit, got ' || v_status;

  RESET ROLE;
  RAISE NOTICE 'approval-gate assertions passed';
END $$;

-- ============================================================
-- 2. An approved event that is edited goes back for review
-- ============================================================
DO $$
DECLARE
  v_biz    UUID;
  v_owner  UUID;
  v_admin  UUID;
  v_event  UUID;
  v_status TEXT;
BEGIN
  SELECT b.id, b.owner_id INTO v_biz, v_owner
  FROM public.businesses b
  WHERE b.status = 'verified' AND b.archived_at IS NULL LIMIT 1;
  SELECT p.id INTO v_admin FROM public.profiles p WHERE p.role = 'admin' LIMIT 1;
  ASSERT v_admin IS NOT NULL, 'fixture: no admin profile in the database';

  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.events (business_id, name, address, starts_at, ends_at)
  VALUES (v_biz, 'Re-arm: free coffee', 'Plaza',
          now() + interval '2 days', now() + interval '3 days')
  RETURNING id INTO v_event;
  RESET ROLE;

  -- Admin approves.
  PERFORM pg_temp.act_as(v_admin);
  SET LOCAL ROLE authenticated;
  UPDATE public.events
     SET status = 'approved', reviewed_by = v_admin, reviewed_at = now(), priority = 5
   WHERE id = v_event;
  SELECT status INTO v_status FROM public.events WHERE id = v_event;
  ASSERT v_status = 'approved', 'an admin must be able to approve, got ' || v_status;
  RESET ROLE;

  -- Owner edits the content of the approved event.
  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;
  UPDATE public.events SET name = 'Re-arm: something else entirely' WHERE id = v_event;
  SELECT status INTO v_status FROM public.events WHERE id = v_event;
  ASSERT v_status = 'pending_review',
    'editing an approved event must send it back for review, got ' || v_status;

  -- Re-approve, then archive: pulling your own event is not a content change.
  RESET ROLE;
  PERFORM pg_temp.act_as(v_admin);
  SET LOCAL ROLE authenticated;
  UPDATE public.events SET status = 'approved' WHERE id = v_event;
  RESET ROLE;

  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;
  UPDATE public.events SET archived_at = now() WHERE id = v_event;
  SELECT status INTO v_status FROM public.events WHERE id = v_event;
  ASSERT v_status = 'approved',
    'archiving is not a content edit and must not re-arm review, got ' || v_status;

  RESET ROLE;
  RAISE NOTICE 're-arm assertions passed';
END $$;

-- ============================================================
-- 3. Constraints: cross-shop product, URLs, dates, daily window
-- ============================================================
DO $$
DECLARE
  v_biz     UUID;
  v_owner   UUID;
  v_other   UUID;
  v_mine    UUID;
  v_ok      BOOLEAN;
BEGIN
  SELECT b.id, b.owner_id INTO v_biz, v_owner
  FROM public.businesses b
  WHERE b.status = 'verified' AND b.archived_at IS NULL
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.business_id = b.id)
  LIMIT 1;
  SELECT p.id INTO v_mine  FROM public.products p WHERE p.business_id = v_biz LIMIT 1;
  SELECT p.id INTO v_other FROM public.products p WHERE p.business_id <> v_biz LIMIT 1;

  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;

  -- Promoting another shop's offering: the composite FK, not application code.
  v_ok := false;
  BEGIN
    INSERT INTO public.events (business_id, product_id, name, address, starts_at, ends_at)
    VALUES (v_biz, v_other, 'X', 'x', now() + interval '1 day', now() + interval '2 days');
  EXCEPTION WHEN foreign_key_violation THEN v_ok := true;
  END;
  ASSERT v_ok, 'an event must not be able to promote another shop''s product';

  -- Promoting your own is fine.
  INSERT INTO public.events (business_id, product_id, name, address, starts_at, ends_at)
  VALUES (v_biz, v_mine, 'Legit', 'x', now() + interval '1 day', now() + interval '2 days');

  -- javascript: URL — Zod is bypassable through PostgREST, so the DB says no too.
  FOREACH v_ok IN ARRAY ARRAY[true] LOOP END LOOP;  -- no-op, keeps the block tidy
  v_ok := false;
  BEGIN
    INSERT INTO public.events (business_id, name, address, starts_at, ends_at, link_url)
    VALUES (v_biz, 'X', 'x', now() + interval '1 day', now() + interval '2 days', 'javascript:alert(1)');
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  ASSERT v_ok, 'link_url must reject a javascript: scheme';

  v_ok := false;
  BEGIN
    INSERT INTO public.events (business_id, name, address, starts_at, ends_at, ticket_url)
    VALUES (v_biz, 'X', 'x', now() + interval '1 day', now() + interval '2 days', 'data:text/html,<script>');
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  ASSERT v_ok, 'ticket_url must reject a data: scheme';

  -- Inverted dates.
  v_ok := false;
  BEGIN
    INSERT INTO public.events (business_id, name, address, starts_at, ends_at)
    VALUES (v_biz, 'X', 'x', now() + interval '3 days', now() + interval '1 day');
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  ASSERT v_ok, 'ends_at must be after starts_at';

  -- Half a daily window is not a window.
  v_ok := false;
  BEGIN
    INSERT INTO public.events (business_id, name, address, starts_at, ends_at, daily_start_time)
    VALUES (v_biz, 'X', 'x', now() + interval '1 day', now() + interval '2 days', '10:00');
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  ASSERT v_ok, 'daily_start_time and daily_end_time must be set together';

  -- An overnight daily window is legal — it closes after midnight.
  INSERT INTO public.events (business_id, name, address, starts_at, ends_at,
                             daily_start_time, daily_end_time)
  VALUES (v_biz, 'Night market', 'x', now() + interval '1 day', now() + interval '4 days',
          '18:00', '02:00');

  RESET ROLE;
  RAISE NOTICE 'constraint assertions passed';
END $$;

-- ============================================================
-- 4. Visibility — anon sees approved live events and nothing else
-- ============================================================
DO $$
DECLARE
  v_biz       UUID;
  v_owner     UUID;
  v_admin     UUID;
  v_pending   UUID;
  v_approved  UUID;
  v_count     INTEGER;
BEGIN
  SELECT b.id, b.owner_id INTO v_biz, v_owner
  FROM public.businesses b
  WHERE b.status = 'verified' AND b.archived_at IS NULL LIMIT 1;
  SELECT p.id INTO v_admin FROM public.profiles p WHERE p.role = 'admin' LIMIT 1;

  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.events (business_id, name, address, starts_at, ends_at)
  VALUES (v_biz, 'Vis: pending', 'x', now() + interval '1 day', now() + interval '2 days')
  RETURNING id INTO v_pending;
  INSERT INTO public.events (business_id, name, address, starts_at, ends_at)
  VALUES (v_biz, 'Vis: approved', 'x', now() + interval '1 day', now() + interval '2 days')
  RETURNING id INTO v_approved;
  RESET ROLE;

  PERFORM pg_temp.act_as(v_admin);
  SET LOCAL ROLE authenticated;
  UPDATE public.events SET status = 'approved' WHERE id = v_approved;
  RESET ROLE;

  -- Anonymous visitor.
  PERFORM pg_temp.act_as_anon();
  SET LOCAL ROLE anon;

  SELECT count(*) INTO v_count FROM public.events WHERE id = v_pending;
  ASSERT v_count = 0, 'anon must not see a pending_review event';

  SELECT count(*) INTO v_count FROM public.events WHERE id = v_approved;
  ASSERT v_count = 1, 'anon must see an approved event of a verified shop';

  RESET ROLE;

  -- Archiving hides it again.
  PERFORM pg_temp.act_as(v_admin);
  SET LOCAL ROLE authenticated;
  UPDATE public.events SET archived_at = now() WHERE id = v_approved;
  RESET ROLE;

  PERFORM pg_temp.act_as_anon();
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_count FROM public.events WHERE id = v_approved;
  ASSERT v_count = 0, 'anon must not see an archived event';
  RESET ROLE;

  RAISE NOTICE 'visibility assertions passed';
END $$;

-- ============================================================
-- 5. notify_event_proposal_submitted
-- ============================================================
DO $$
DECLARE
  v_biz       UUID;
  v_owner     UUID;
  v_stranger  UUID;
  v_event     UUID;
  v_admins    INTEGER;
  v_sent      INTEGER;
  v_ok        BOOLEAN;
BEGIN
  SELECT b.id, b.owner_id INTO v_biz, v_owner
  FROM public.businesses b
  WHERE b.status = 'verified' AND b.archived_at IS NULL LIMIT 1;
  SELECT b.owner_id INTO v_stranger
  FROM public.businesses b WHERE b.owner_id <> v_owner LIMIT 1;

  SELECT count(*) INTO v_admins
  FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL;
  ASSERT v_admins > 0, 'fixture: no live admin to notify';

  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;

  -- A draft pings nobody.
  --
  -- NOTE: this bounds WHICH events notify, not HOW MANY TIMES. The RPC is
  -- granted to `authenticated` and reachable directly at
  -- /rest/v1/rpc/notify_event_proposal_submitted, so calling it repeatedly on
  -- one pending_review event still inserts a row per admin per call. Nothing
  -- below asserts otherwise — do not read this block as proof of a rate limit.
  INSERT INTO public.events (business_id, name, address, starts_at, ends_at, status)
  VALUES (v_biz, 'Notify: draft', 'x', now() + interval '1 day', now() + interval '2 days', 'draft')
  RETURNING id INTO v_event;
  v_sent := public.notify_event_proposal_submitted(v_event);
  ASSERT v_sent = 0, 'a draft must not notify the admins, sent ' || v_sent;

  -- A submitted proposal notifies every live admin, exactly once each.
  UPDATE public.events SET status = 'pending_review' WHERE id = v_event;
  v_sent := public.notify_event_proposal_submitted(v_event);
  ASSERT v_sent = v_admins,
    'expected one notification per live admin (' || v_admins || '), got ' || v_sent;

  -- Count from OUTSIDE the owner's session: `notifications` RLS only returns
  -- rows addressed to the caller, so the owner cannot see what the admins got.
  -- That is the policy working, not a bug — but it means the assertion has to
  -- look from a vantage point that bypasses RLS.
  RESET ROLE;
  SELECT count(*) INTO v_sent
  FROM public.notifications
  WHERE type = 'event_proposal_submitted'
    AND (metadata ->> 'event_id') = v_event::text;
  ASSERT v_sent = v_admins,
    'expected ' || v_admins || ' notification rows, found ' || v_sent;

  -- Every recipient must actually be an admin.
  SELECT count(*) INTO v_sent
  FROM public.notifications n
  WHERE n.type = 'event_proposal_submitted'
    AND (n.metadata ->> 'event_id') = v_event::text
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = n.user_id AND p.role = 'admin' AND p.archived_at IS NULL
    );
  ASSERT v_sent = 0, 'a proposal notification reached a non-admin recipient';

  -- A stranger cannot announce someone else's event.
  PERFORM pg_temp.act_as(v_stranger);
  SET LOCAL ROLE authenticated;
  v_ok := false;
  BEGIN
    PERFORM public.notify_event_proposal_submitted(v_event);
  EXCEPTION WHEN OTHERS THEN v_ok := true;
  END;
  ASSERT v_ok, 'a stranger must not be able to notify for another shop''s event';

  RESET ROLE;
  RAISE NOTICE 'notification assertions passed';
END $$;

-- ============================================================
-- 6. events_nearby
-- ============================================================
DO $$
DECLARE
  v_biz      UUID;
  v_owner    UUID;
  v_admin    UUID;
  v_near     UUID;
  v_pending  UUID;
  v_count    INTEGER;
BEGIN
  SELECT b.id, b.owner_id INTO v_biz, v_owner
  FROM public.businesses b
  WHERE b.status = 'verified' AND b.archived_at IS NULL LIMIT 1;
  SELECT p.id INTO v_admin FROM public.profiles p WHERE p.role = 'admin' LIMIT 1;

  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;
  -- Iloilo City Proper.
  INSERT INTO public.events (business_id, name, address, starts_at, ends_at, location)
  VALUES (v_biz, 'Nearby: approved', 'Iznart St',
          now() + interval '1 day', now() + interval '2 days',
          ST_MakePoint(122.5649, 10.6973)::geography)
  RETURNING id INTO v_near;
  INSERT INTO public.events (business_id, name, address, starts_at, ends_at, location)
  VALUES (v_biz, 'Nearby: pending', 'Iznart St',
          now() + interval '1 day', now() + interval '2 days',
          ST_MakePoint(122.5649, 10.6973)::geography)
  RETURNING id INTO v_pending;
  RESET ROLE;

  PERFORM pg_temp.act_as(v_admin);
  SET LOCAL ROLE authenticated;
  UPDATE public.events SET status = 'approved' WHERE id = v_near;
  RESET ROLE;

  SELECT count(*) INTO v_count
  FROM public.events_nearby(10.6973, 122.5649, 5000) WHERE id = v_near;
  ASSERT v_count = 1, 'events_nearby must return an approved event at the search point';

  SELECT count(*) INTO v_count
  FROM public.events_nearby(10.6973, 122.5649, 5000) WHERE id = v_pending;
  ASSERT v_count = 0, 'events_nearby must not leak a pending_review event';

  -- A point far away (Manila) must not match a 5km radius around Iloilo.
  SELECT count(*) INTO v_count
  FROM public.events_nearby(14.5995, 120.9842, 5000) WHERE id = v_near;
  ASSERT v_count = 0, 'events_nearby must respect the radius';

  RAISE NOTICE 'nearby assertions passed';
END $$;

-- ============================================================
-- 6b. Followers are told when an event is published
-- ============================================================
DO $$
DECLARE
  v_biz       UUID;
  v_owner     UUID;
  v_admin     UUID;
  v_follower  UUID;
  v_event     UUID;
  v_count     INTEGER;
BEGIN
  SELECT b.id, b.owner_id INTO v_biz, v_owner
  FROM public.businesses b
  WHERE b.status = 'verified' AND b.archived_at IS NULL LIMIT 1;
  SELECT p.id INTO v_admin FROM public.profiles p WHERE p.role = 'admin' LIMIT 1;

  -- A follower who is not the owner.
  SELECT p.id INTO v_follower
  FROM public.profiles p WHERE p.id <> v_owner AND p.archived_at IS NULL LIMIT 1;
  INSERT INTO public.follows (user_id, business_id)
  VALUES (v_follower, v_biz)
  ON CONFLICT DO NOTHING;

  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.events (business_id, name, address, starts_at, ends_at)
  VALUES (v_biz, 'Fanout: night market', 'x',
          now() + interval '2 days', now() + interval '3 days')
  RETURNING id INTO v_event;
  RESET ROLE;

  -- Nothing yet: a proposal is not a publication.
  SELECT count(*) INTO v_count
  FROM public.business_notifications
  WHERE type = 'event' AND (data ->> 'event_id') = v_event::text;
  ASSERT v_count = 0, 'a pending proposal must not notify followers';

  -- Approving publishes it, and the fan-out runs.
  PERFORM pg_temp.act_as(v_admin);
  SET LOCAL ROLE authenticated;
  UPDATE public.events SET status = 'approved' WHERE id = v_event;

  RESET ROLE;
  SELECT count(*) INTO v_count
  FROM public.business_notifications
  WHERE type = 'event'
    AND (data ->> 'event_id') = v_event::text
    AND user_id = v_follower;
  ASSERT v_count = 1,
    'the follower should have exactly one event notification, found ' || v_count;

  -- Re-saving an already-approved event must not notify again.
  PERFORM pg_temp.act_as(v_admin);
  SET LOCAL ROLE authenticated;
  UPDATE public.events SET status = 'approved', priority = 3 WHERE id = v_event;
  RESET ROLE;

  SELECT count(*) INTO v_count
  FROM public.business_notifications
  WHERE type = 'event'
    AND (data ->> 'event_id') = v_event::text
    AND user_id = v_follower;
  ASSERT v_count = 1,
    'republishing must not re-notify; found ' || v_count || ' notifications';

  RAISE NOTICE 'follower fan-out assertions passed';
END $$;

-- ============================================================
-- 3b. A published row cannot be moved out from under review
-- ============================================================
DO $$
DECLARE
  v_biz     UUID;
  v_biz2    UUID;
  v_owner   UUID;
  v_admin   UUID;
  v_product UUID;
  v_event   UUID;
  v_status  TEXT;
  v_bizid   UUID;
  v_prod    UUID;
BEGIN
  -- Two shops with the SAME owner — the case that makes re-pointing possible.
  SELECT b.id, b.owner_id INTO v_biz, v_owner
  FROM public.businesses b
  WHERE b.status = 'verified' AND b.archived_at IS NULL
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.business_id = b.id)
  LIMIT 1;
  SELECT b.id INTO v_biz2
  FROM public.businesses b
  WHERE b.owner_id = v_owner AND b.id <> v_biz LIMIT 1;
  SELECT p.id INTO v_product FROM public.products p WHERE p.business_id = v_biz LIMIT 1;
  SELECT p.id INTO v_admin FROM public.profiles p WHERE p.role = 'admin' LIMIT 1;

  ASSERT v_biz2 IS NOT NULL, 'fixture: need an owner holding two shops';

  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.events (business_id, product_id, name, address, starts_at, ends_at)
  VALUES (v_biz, v_product, 'Move: promoted event', 'x',
          now() + interval '2 days', now() + interval '3 days')
  RETURNING id INTO v_event;
  RESET ROLE;

  PERFORM pg_temp.act_as(v_admin);
  SET LOCAL ROLE authenticated;
  UPDATE public.events SET status = 'approved' WHERE id = v_event;
  RESET ROLE;

  -- (a) An owner must not be able to re-point an APPROVED event at another of
  -- their shops — the WITH CHECK only proves they own the TARGET, so without
  -- a trigger freeze it would stay published under a shop nobody reviewed.
  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;
  UPDATE public.events SET business_id = v_biz2 WHERE id = v_event;
  RESET ROLE;

  SELECT business_id, status INTO v_bizid, v_status
  FROM public.events WHERE id = v_event;
  ASSERT v_bizid = v_biz,
    'an owner must not move an event between their own shops';
  ASSERT v_status = 'approved',
    'a refused move must not disturb the status, got ' || v_status;

  -- (b) Deleting the promoted product must drop the PROMOTION, not the shop.
  -- A bare `ON DELETE SET NULL` nulls every referencing column, which would
  -- turn this into a platform event: published with no verified-shop gate and
  -- unreachable by any owner policy.
  DELETE FROM public.products WHERE id = v_product;

  SELECT business_id, product_id INTO v_bizid, v_prod
  FROM public.events WHERE id = v_event;
  ASSERT v_prod IS NULL, 'the promotion should be cleared, got ' || v_prod;
  ASSERT v_bizid = v_biz,
    'deleting a product must NOT orphan the event from its shop';

  RAISE NOTICE 'published-row-integrity assertions passed';
END $$;

-- ============================================================
-- 3c. Coordinates survive an edit that does not mention them
-- ============================================================
DO $$
DECLARE
  v_biz   UUID;
  v_owner UUID;
  v_event UUID;
  v_lat   DOUBLE PRECISION;
  v_lng   DOUBLE PRECISION;
BEGIN
  SELECT b.id, b.owner_id INTO v_biz, v_owner
  FROM public.businesses b
  WHERE b.status = 'verified' AND b.archived_at IS NULL LIMIT 1;

  PERFORM pg_temp.act_as(v_owner);
  SET LOCAL ROLE authenticated;

  INSERT INTO public.events (business_id, name, address, starts_at, ends_at, location)
  VALUES (v_biz, 'Coords: pinned', 'Iznart St',
          now() + interval '1 day', now() + interval '2 days',
          ST_MakePoint(122.5649, 10.6973)::geography)
  RETURNING id INTO v_event;

  -- The generated pair is what the edit form reads back; without it the form
  -- has nothing to prefill and every save looks like a deliberate clear.
  SELECT latitude, longitude INTO v_lat, v_lng
  FROM public.events WHERE id = v_event;
  ASSERT round(v_lat::numeric, 4) = 10.6973,
    'latitude must project from location, got ' || coalesce(v_lat::text, '<null>');
  ASSERT round(v_lng::numeric, 4) = 122.5649,
    'longitude must project from location, got ' || coalesce(v_lng::text, '<null>');

  -- An edit that never mentions location leaves the pin alone.
  UPDATE public.events SET name = 'Coords: renamed' WHERE id = v_event;
  SELECT latitude INTO v_lat FROM public.events WHERE id = v_event;
  ASSERT v_lat IS NOT NULL, 'an unrelated edit must not clear the point';

  -- And the pair is generated, so a client cannot write it directly.
  BEGIN
    UPDATE public.events SET latitude = 0 WHERE id = v_event;
    ASSERT false, 'latitude must be generated, not writable';
  EXCEPTION WHEN generated_always THEN NULL;
  END;

  RESET ROLE;
  RAISE NOTICE 'coordinate assertions passed';
END $$;

-- ============================================================
-- 6c. An anonymous visitor can read the feature flag
-- ============================================================
DO $$
DECLARE
  v_flags RECORD;
  v_rows  INTEGER;
BEGIN
  PERFORM pg_temp.act_as_anon();
  SET LOCAL ROLE anon;

  -- The hole this closes: `app_settings` is readable TO authenticated only, so
  -- a direct table read returns nothing for anon and the app's flag reader
  -- fails closed — making the entire public events surface invisible to
  -- exactly the audience it exists for.
  SELECT count(*) INTO v_rows FROM public.app_settings;
  ASSERT v_rows = 0,
    'app_settings must stay closed to anon — the RPC is the public door';

  SELECT * INTO v_flags FROM public.public_feature_flags();
  ASSERT v_flags.enable_events IS NOT NULL,
    'anon must be able to read enable_events through the RPC';
  ASSERT v_flags.enable_bookings IS NOT NULL,
    'anon must be able to read enable_bookings through the RPC';
  -- Added by 20260805090000: the public /for-business page describes the
  -- registration flow to logged-out visitors, and reading these from the table
  -- gave it zero rows and no error — so it advertised the strict defaults.
  ASSERT v_flags.require_business_documents IS NOT NULL,
    'anon must be able to read require_business_documents through the RPC';
  ASSERT v_flags.auto_verify_businesses IS NOT NULL,
    'anon must be able to read auto_verify_businesses through the RPC';

  RESET ROLE;

  -- The return list IS the contract: exactly these four columns, so a settings
  -- row added later stays private unless someone deliberately widens this.
  -- `enable_onboarding_tour` is the live example — it exists in app_settings
  -- and is deliberately NOT here.
  -- Read from pg_proc — a RETURNS TABLE function's output columns are its
  -- 't'-mode arguments, and information_schema.columns does not describe them.
  SELECT count(*) INTO v_rows
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace,
       unnest(COALESCE(p.proargmodes, ARRAY[]::"char"[])) AS mode
  WHERE n.nspname = 'public'
    AND p.proname = 'public_feature_flags'
    AND mode = 't';
  ASSERT v_rows = 4,
    'public_feature_flags must expose exactly 4 columns, found ' || v_rows;

  SELECT count(*) INTO v_rows
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace,
       unnest(p.proargnames) AS arg
  WHERE n.nspname = 'public'
    AND p.proname = 'public_feature_flags'
    AND arg = 'enable_onboarding_tour';
  ASSERT v_rows = 0,
    'enable_onboarding_tour must stay private — it is owner-facing only';

  RAISE NOTICE 'public flag assertions passed';
END $$;

-- ============================================================
-- 7. Structural: policies wrap auth.uid(), indexes exist, functions pinned
-- ============================================================
DO $$
DECLARE
  v_total   INTEGER;
  v_wrapped INTEGER;
  v_count   INTEGER;
BEGIN
  -- P1 perf standard (20260717000002): a bare auth.uid() re-evaluates once per
  -- row scanned; wrapped, the planner runs it once as an initPlan.
  --
  -- Counted rather than regex-matched: Postgres stores the wrapped form as
  -- `( SELECT auth.uid() AS uid)` — capitalised, with a leading space — and
  -- lookbehind is not portable across Postgres regex versions. Every
  -- occurrence of auth.uid() must be inside a SELECT.
  SELECT
    COALESCE(SUM((length(e) - length(replace(e, 'auth.uid()', ''))) / length('auth.uid()')), 0),
    COALESCE(SUM((length(e) - length(replace(e, 'SELECT auth.uid()', ''))) / length('SELECT auth.uid()')), 0)
  INTO v_total, v_wrapped
  FROM (
    SELECT COALESCE(qual, '') || ' ' || COALESCE(with_check, '') AS e
    FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events'
  ) p;

  ASSERT v_total = v_wrapped,
    'every events policy must wrap auth.uid() as (select auth.uid()); '
    || (v_total - v_wrapped) || ' of ' || v_total || ' are bare';

  -- The banner, queue, FK and GIST indexes.
  SELECT count(*) INTO v_count FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'events'
    AND indexname IN ('idx_events_live_banner', 'idx_events_review_queue',
                      'idx_events_business', 'idx_events_product', 'idx_events_location');
  ASSERT v_count = 5, 'expected 5 events indexes, found ' || v_count;

  -- SECURITY DEFINER functions must pin their search_path.
  SELECT count(*) INTO v_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('events_nearby', 'notify_event_proposal_submitted',
                      'set_event_initial_status', 'guard_event_review_columns',
                      'public_feature_flags', 'handle_event_published_notification')
    AND p.prosecdef
    AND EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) c
                WHERE c LIKE 'search_path=%');
  ASSERT v_count = 6,
    'all 6 events SECURITY DEFINER functions must SET search_path, found ' || v_count;

  -- Both gate triggers must survive session_replication_role = replica.
  SELECT count(*) INTO v_count FROM pg_trigger
  WHERE tgrelid = 'public.events'::regclass
    AND tgname IN ('trg_set_event_initial_status', 'trg_guard_event_review_columns')
    AND tgenabled = 'A';
  ASSERT v_count = 2,
    'both gate triggers must be ENABLE ALWAYS or seeding skips them, found ' || v_count;

  RAISE NOTICE 'structural assertions passed';
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL EVENT TESTS PASSED'; END $$;

ROLLBACK;
