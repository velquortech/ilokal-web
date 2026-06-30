-- Behavioral tests for the mobile_deals RPC + notification outbox worker.
--
-- Asserts against the local seed data; non-destructive (everything runs inside a
-- transaction that is ROLLBACK'd at the end). Any ASSERT failure aborts with a
-- clear error. Run:
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/mobile_deals_and_outbox.test.sql
--
-- (or pipe the file in via < as above). Expected tail: "ALL SQL TESTS PASSED".

BEGIN;

DO $$
DECLARE
  j              JSONB;
  v_total        INT;
  v_big_biz      UUID;
  v_small_biz    UUID;
  v_small_count  INT;
  v_followers    INT;
  v_delivered    INT;
  v_distinct     INT;
  v_status       TEXT;
  p1             TEXT[];
  p2             TEXT[];
BEGIN
  -- ───────────────────────── mobile_deals ──────────────────────────────────

  -- Shape: always a non-null object; flash/explore are arrays (never null).
  j := public.mobile_deals('All', '', 1, 5);
  ASSERT j IS NOT NULL, 'mobile_deals returned NULL';
  ASSERT jsonb_typeof(j->'flash')   = 'array', 'flash must be an array';
  ASSERT jsonb_typeof(j->'explore') = 'array', 'explore must be an array';
  ASSERT (j->>'explore_total')::int >= 0, 'explore_total must be >= 0';

  -- Empty / unknown category → valid empty payload, not NULL and not an error.
  j := public.mobile_deals('Bogus', '', 1, 5);
  ASSERT j->'featured' = 'null'::jsonb OR j->'featured' IS NULL,
         'unknown category should have no featured';
  ASSERT jsonb_array_length(j->'flash')   = 0, 'unknown category flash empty';
  ASSERT jsonb_array_length(j->'explore') = 0, 'unknown category explore empty';
  ASSERT (j->>'explore_total') = '0', 'unknown category total 0';

  -- Featured must be the most-redeemed non-flash deal (ground-truth compare).
  j := public.mobile_deals('All', '', 1, 5);
  ASSERT (j->'featured'->>'code') = (
    SELECT c.code FROM public.coupons c
    JOIN public.businesses b ON b.id = c.business_id
    WHERE c.status='published' AND c.archived_at IS NULL
      AND c.start_date <= now() AND c.expiry_date >= now()
    ORDER BY (c.expiry_date <= now() + INTERVAL '7 days') ASC,
             c.current_redemptions DESC, c.expiry_date ASC, c.id ASC
    LIMIT 1
  ), 'featured is not the top non-flash deal';

  -- Featured is excluded from flash + explore (no double exposure).
  ASSERT NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(j->'explore') e
    WHERE e->>'id' = j->'featured'->>'id'
  ), 'featured leaked into explore';

  -- Deterministic pagination: page 1 and page 2 must not overlap.
  SELECT array_agg(e->>'id') INTO p1
  FROM jsonb_array_elements(public.mobile_deals('All','',1,10)->'explore') e;
  SELECT array_agg(e->>'id') INTO p2
  FROM jsonb_array_elements(public.mobile_deals('All','',2,10)->'explore') e;
  ASSERT NOT (p1 && p2), 'explore pages 1 and 2 overlap (non-deterministic paging)';

  -- has_more agrees with totals.
  j := public.mobile_deals('All','',1,5);
  v_total := (j->>'explore_total')::int;
  ASSERT (j->>'explore_has_more')::boolean = (5 < v_total),
         'explore_has_more disagrees with explore_total';

  RAISE NOTICE 'mobile_deals: PASS';

  -- ──────────────────────── notification outbox ────────────────────────────

  -- Pick the most-followed verified business for the worker tests.
  SELECT b.id, count(f.user_id)
  INTO v_big_biz, v_followers
  FROM public.businesses b
  JOIN public.follows f ON f.business_id = b.id
  WHERE b.status='verified' AND b.archived_at IS NULL AND f.user_id IS NOT NULL
  GROUP BY b.id ORDER BY count(f.user_id) DESC LIMIT 1;
  ASSERT v_followers > 0, 'no seed business with followers to test';

  -- INLINE path: a small audience fans out directly into business_notifications
  -- with no outbox row.
  PERFORM public.notify_followers(v_big_biz, 'promo', 'TEST_INLINE', 'b', '{}'::jsonb);
  SELECT count(*) INTO v_delivered FROM public.business_notifications WHERE title='TEST_INLINE';
  ASSERT v_delivered = v_followers, 'inline fan-out count mismatch';
  ASSERT NOT EXISTS (SELECT 1 FROM public.notification_outbox WHERE title='TEST_INLINE'),
         'inline path should not enqueue an outbox row';

  -- WORKER path: enqueue an event, drain in tiny batches; exactly-once + done.
  INSERT INTO public.notification_outbox (business_id, type, title, body, data)
  VALUES (v_big_biz, 'product', 'TEST_WORKER', 'b', '{}'::jsonb);
  PERFORM public.process_notification_outbox(2, 1000000, 1000000);
  SELECT status INTO v_status FROM public.notification_outbox WHERE title='TEST_WORKER';
  SELECT count(*), count(DISTINCT user_id) INTO v_delivered, v_distinct
  FROM public.business_notifications WHERE title='TEST_WORKER';
  ASSERT v_status = 'done', 'worker did not mark event done';
  ASSERT v_delivered = v_followers, 'worker delivered count mismatch';
  ASSERT v_distinct  = v_followers, 'worker produced duplicate notifications';
  -- Idempotent: a re-run delivers nothing more.
  ASSERT public.process_notification_outbox(2, 1000000, 1000000) = 0,
         'worker re-run delivered extra rows';

  -- FAIRNESS: a big event queued first must NOT starve a small one queued later
  -- within the same tick (per-event cap yields to the next event). Seed data only
  -- gives each business a single follower, so synthesize the audiences this test
  -- needs: a *distinct* small business, and pad v_big_biz past the per-event cap.
  SELECT b.id INTO v_small_biz
  FROM public.businesses b
  JOIN public.follows f ON f.business_id = b.id
  WHERE b.status='verified' AND b.archived_at IS NULL AND f.user_id IS NOT NULL
    AND b.id <> v_big_biz
  GROUP BY b.id ORDER BY count(f.user_id) ASC, b.id ASC LIMIT 1;
  ASSERT v_small_biz IS NOT NULL, 'need a second verified business with followers';

  -- Give v_big_biz more followers than the per-event cap (5) so a single tick
  -- can't drain it — pull from profiles that don't already follow it.
  INSERT INTO public.follows (user_id, business_id)
  SELECT p.id, v_big_biz
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.follows f
    WHERE f.business_id = v_big_biz AND f.user_id = p.id
  )
  ORDER BY p.id
  LIMIT 8;

  INSERT INTO public.notification_outbox (business_id, type, title, body, data, created_at)
  VALUES (v_big_biz,   'product', 'TEST_BIG',   'b', '{}'::jsonb, now() - INTERVAL '1 min');
  INSERT INTO public.notification_outbox (business_id, type, title, body, data, created_at)
  VALUES (v_small_biz, 'product', 'TEST_SMALL', 'b', '{}'::jsonb, now());
  PERFORM public.process_notification_outbox(5, 1000000, 5); -- per-event cap 5
  ASSERT (SELECT status FROM public.notification_outbox WHERE title='TEST_BIG')   = 'processing',
         'big event should have yielded (processing)';
  ASSERT (SELECT status FROM public.notification_outbox WHERE title='TEST_SMALL') = 'done',
         'small event starved behind big event (head-of-line blocking)';

  -- PRUNE: terminal rows older than 7 days are removed; recent ones kept.
  INSERT INTO public.notification_outbox (business_id, type, title, status, processed_at)
  VALUES (gen_random_uuid(), 'post', 'TEST_OLD', 'done', now() - INTERVAL '8 days');
  PERFORM public.prune_notification_outbox();
  ASSERT NOT EXISTS (SELECT 1 FROM public.notification_outbox WHERE title='TEST_OLD'),
         'prune did not remove old done row';
  ASSERT EXISTS (SELECT 1 FROM public.notification_outbox WHERE title='TEST_SMALL'),
         'prune removed a recent row';

  RAISE NOTICE 'notification outbox: PASS';
  RAISE NOTICE 'ALL SQL TESTS PASSED';
END $$;

ROLLBACK;
