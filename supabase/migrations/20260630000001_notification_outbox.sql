-- Make follower fan-out scale: don't hold a business's publish transaction open
-- across one INSERT-per-follower.
--
-- BEFORE: `notify_followers` (20260611000000) ran a single INSERT…SELECT over
-- every follower *inside the source row's transaction*. Fine at seed scale, but
-- a business with a very large following would slow its own product/post/coupon
-- writes — the dashboard waits for N row inserts before the publish commits.
--
-- AFTER (adaptive): small audiences still fan out INLINE (instant delivery, the
-- common case is unchanged). Above a threshold, the trigger instead enqueues ONE
-- `notification_outbox` row (O(1) for the publisher) and a pg_cron worker expands
-- it into per-follower rows in batches, outside any publish transaction. The
-- mobile badge stays live either way — the worker writes the same
-- business_notifications rows the Realtime subscription already listens on; large
-- audiences just fill in over a few worker ticks instead of all at once.

-- Index for the fan-out's per-business lookup + keyset pagination. The existing
-- unique index leads with user_id, so `WHERE business_id = ? ORDER BY user_id`
-- had no usable index.
CREATE INDEX IF NOT EXISTS idx_follows_business_user
  ON public.follows (business_id, user_id);

-- One row per publish EVENT (not per follower). The worker drains it into
-- business_notifications, advancing last_user_id as a keyset cursor over
-- follows.user_id so a partially-processed event resumes without dupes.
-- `attempts`/'failed' park a poison event after repeated errors instead of
-- retrying it every minute forever.
CREATE TABLE public.notification_outbox (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('post', 'promo', 'product')),
  title        TEXT NOT NULL,
  body         TEXT,
  data         JSONB,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  last_user_id UUID,                       -- keyset cursor over follows.user_id
  attempts     INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Worker scans the unfinished queue oldest-first.
CREATE INDEX idx_notification_outbox_unfinished
  ON public.notification_outbox (created_at)
  WHERE status IN ('pending', 'processing');

-- Client-invisible: rows are produced by the SECURITY DEFINER fan-out and
-- drained by the cron worker. No RLS policies = no PostgREST access for
-- anon/authenticated (RLS-on with no policy denies all); service_role bypasses.
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Adaptive fan-out. Inline below the threshold (instant), enqueue above it.
CREATE OR REPLACE FUNCTION public.notify_followers(
  p_business_id UUID,
  p_type        TEXT,
  p_title       TEXT,
  p_body        TEXT,
  p_data        JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Above this many followers, defer to the async worker so the publishing
  -- transaction commits without waiting on the full fan-out. Tune as real
  -- follower counts grow; inline up to here keeps small-business delivery instant.
  v_threshold CONSTANT INT := 500;
  v_over_threshold BOOLEAN;
BEGIN
  -- Same visibility gate the feed applies: only verified, non-archived
  -- businesses notify.
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.status = 'verified'
      AND b.archived_at IS NULL
  ) THEN
    RETURN;
  END IF;

  -- Bounded probe: only need to know "more than threshold?", so stop at row
  -- threshold+1 instead of counting the entire (possibly huge) following.
  v_over_threshold := EXISTS (
    SELECT 1 FROM public.follows f
    WHERE f.business_id = p_business_id
      AND f.user_id IS NOT NULL
    OFFSET v_threshold LIMIT 1
  );

  IF NOT v_over_threshold THEN
    INSERT INTO public.business_notifications (user_id, type, title, body, data)
    SELECT f.user_id, p_type, p_title, p_body, p_data
    FROM public.follows f
    WHERE f.business_id = p_business_id
      AND f.user_id IS NOT NULL;
  ELSE
    INSERT INTO public.notification_outbox (business_id, type, title, body, data)
    VALUES (p_business_id, p_type, p_title, p_body, p_data);
  END IF;
END;
$$;

-- Re-assert the lockdown (CREATE OR REPLACE keeps the ACL, but be explicit):
-- trigger-only helper, never a client RPC.
REVOKE EXECUTE ON FUNCTION public.notify_followers(UUID, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;

-- Drain the outbox into per-follower business_notifications rows. Each event is
-- advanced via a keyset cursor on follows.user_id, in batches of p_batch.
--
-- Fairness: a single event drains at most p_max_rows_per_event rows per call
-- before yielding to the next queued event, so a huge backlog can't starve a
-- small event queued behind it (head-of-line blocking). The whole call is also
-- bounded by p_max_rows. Both un-drained cases leave the event 'processing' with
-- its cursor, and the next tick resumes it.
--
-- Cursor is written ONCE per event per call (at the terminal state) — the whole
-- function runs in one transaction (cron invokes it as a single statement), so
-- per-batch UPDATEs would neither commit early nor aid crash recovery; only the
-- final committed state matters, and a crash rolls the inserts back with it.
--
-- FOR UPDATE SKIP LOCKED lets concurrent ticks divide the queue without
-- double-processing an event. Each event is processed inside a subtransaction so
-- one poison event (e.g. a transient error) is isolated: its partial inserts roll
-- back, its attempts counter bumps, and after c_max_attempts it parks as 'failed'
-- instead of being retried every minute forever.
CREATE OR REPLACE FUNCTION public.process_notification_outbox(
  p_batch              INT DEFAULT 2000,   -- followers per insert
  p_max_rows           INT DEFAULT 20000,  -- per-call ceiling across all events
  p_max_rows_per_event INT DEFAULT 6000    -- per-event ceiling per call (fairness)
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_attempts CONSTANT INT := 5;
  v_event      RECORD;
  v_inserted   INT;
  v_last       UUID;
  v_cursor     UUID;
  v_event_rows INT;
  v_total      INT := 0;
  v_done       BOOLEAN;
BEGIN
  FOR v_event IN
    SELECT id, business_id, type, title, body, data, last_user_id
    FROM public.notification_outbox
    WHERE status IN ('pending', 'processing')
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      v_cursor     := v_event.last_user_id;
      v_event_rows := 0;
      v_done       := FALSE;

      LOOP
        WITH batch AS (
          SELECT f.user_id
          FROM public.follows f
          WHERE f.business_id = v_event.business_id
            AND f.user_id IS NOT NULL
            AND (v_cursor IS NULL OR f.user_id > v_cursor)
          ORDER BY f.user_id
          LIMIT p_batch
        ),
        ins AS (
          INSERT INTO public.business_notifications (user_id, type, title, body, data)
          SELECT b.user_id, v_event.type, v_event.title, v_event.body, v_event.data
          FROM batch b
          RETURNING user_id
        )
        -- uuid has no max() aggregate; its canonical text form sorts identically
        -- to the uuid type (fixed-width lowercase hex), so max over text → back to
        -- uuid yields the batch's largest user_id = the next keyset cursor.
        SELECT count(*), max(user_id::text)::uuid INTO v_inserted, v_last FROM ins;

        v_total      := v_total + v_inserted;
        v_event_rows := v_event_rows + v_inserted;
        v_cursor     := COALESCE(v_last, v_cursor);

        IF v_inserted < p_batch THEN
          v_done := TRUE;          -- fewer than a full batch → event drained
          EXIT;
        END IF;

        EXIT WHEN v_total >= p_max_rows OR v_event_rows >= p_max_rows_per_event;
      END LOOP;

      IF v_done THEN
        UPDATE public.notification_outbox
        SET status = 'done', processed_at = now(), last_user_id = v_cursor
        WHERE id = v_event.id;
      ELSE
        -- Yielded (hit a row cap); persist the cursor so the next tick resumes.
        UPDATE public.notification_outbox
        SET status = 'processing', last_user_id = v_cursor
        WHERE id = v_event.id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Isolated to this event (subtransaction rolls back its partial inserts).
      UPDATE public.notification_outbox
      SET attempts = attempts + 1,
          status = CASE WHEN attempts + 1 >= c_max_attempts THEN 'failed' ELSE status END
      WHERE id = v_event.id;
    END;

    EXIT WHEN v_total >= p_max_rows;
  END LOOP;

  RETURN v_total;
END;
$$;

-- Retention: drop terminal rows (done/failed) older than 7 days so the queue
-- table doesn't grow unbounded. Reads are index-scoped so growth is cheap, but
-- there's no reason to keep delivered events forever.
CREATE OR REPLACE FUNCTION public.prune_notification_outbox()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM public.notification_outbox
    WHERE status IN ('done', 'failed')
      AND processed_at < now() - INTERVAL '7 days'
    RETURNING 1
  )
  SELECT count(*)::int FROM deleted;
$$;

-- Worker + prune are infrastructure, not client surface.
REVOKE EXECUTE ON FUNCTION public.process_notification_outbox(INT, INT, INT)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_notification_outbox()
  FROM PUBLIC, anon, authenticated;

-- Schedule drain (every minute) + prune (daily). Wrapped so environments without
-- pg_cron still apply the migration (functions then run only when invoked).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule(
    'process-notification-outbox',
    '* * * * *',
    $job$SELECT public.process_notification_outbox()$job$
  );
  PERFORM cron.schedule(
    'prune-notification-outbox',
    '30 3 * * *',
    $job$SELECT public.prune_notification_outbox()$job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable — run process_notification_outbox()/prune_notification_outbox() manually (%).', SQLERRM;
END;
$$;
