-- ============================================================
-- Events: PR #23 review fixes.
--
-- A NEW migration rather than edits to `20260802034107_events.sql`, because
-- that file is merged to `main` and may already have been applied locally by
-- anyone who pulled it. Editing an applied migration in place leaves their
-- database silently disagreeing with the file that claims to describe it.
--
-- Four changes, all from the PR #23 review:
--
--   1. `(select public.is_admin())` — the admin policies on `events` and on
--      the `event-images` bucket call it BARE, so it is re-evaluated once per
--      row scanned.
--   2. `notify_event_proposal_submitted` has no dedupe, so a direct
--      `/rest/v1/rpc/` call in a loop inserts one row per admin per call.
--   3. No trigram index behind the new PUBLIC leading-wildcard search on
--      `events.name` / `events.address`.
--   4. `events.reviewed_by` is an unindexed FK to `auth.users`.
--
-- Rollback:
--   DROP INDEX public.idx_events_name_trgm;
--   DROP INDEX public.idx_events_address_trgm;
--   DROP INDEX public.idx_events_reviewed_by;
--   -- and re-apply the policy/function bodies from 20260802034107_events.sql.
-- ============================================================

-- 1. Wrap the auth helper so the planner evaluates it once ----------------
--
-- Supabase's #1 RLS performance killer, and CLAUDE.md §API standards: a bare
-- `auth.uid()` / `is_admin()` in a policy is re-evaluated per row scanned;
-- wrapped in a subquery it becomes an initPlan evaluated once per query.
--
-- It matters more here than the usual case. `is_admin()` is a SECURITY DEFINER
-- lookup against `profiles`, and permissive policies are OR'd — so this ran on
-- the ANONYMOUS public-banner read too, once for every candidate event row.
--
-- `20260727000005` already writes `(select public.is_admin())`; this brings the
-- events policy set in line rather than inventing anything.

ALTER POLICY "Admins manage all events" ON public.events
  USING ((select public.is_admin()))
  WITH CHECK ((select public.is_admin()));

-- The storage policies are the same fix, but on `storage.objects`, which is
-- owned by the platform. Each ALTER gets its own subtransaction so a
-- permission failure on a managed instance logs and continues rather than
-- aborting the whole migration — the pattern `20260717000002` established
-- when it swept the live policy set.
DO $$
DECLARE
  v_policy text;
  v_expr   text := $expr$
    bucket_id = 'event-images'
    AND (
      (select public.is_admin())
      OR EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id::text = (storage.foldername(name))[1]
          AND owner_id = (select auth.uid())
          AND archived_at IS NULL
      )
    )
  $expr$;
BEGIN
  FOREACH v_policy IN ARRAY ARRAY[
    'Event images: owner or admin upload',
    'Event images: owner or admin update',
    'Event images: owner or admin delete'
  ] LOOP
    BEGIN
      IF v_policy LIKE '%upload' THEN
        -- INSERT policies have no USING clause.
        EXECUTE format(
          'ALTER POLICY %I ON storage.objects WITH CHECK (%s)',
          v_policy, v_expr
        );
      ELSIF v_policy LIKE '%update' THEN
        EXECUTE format(
          'ALTER POLICY %I ON storage.objects USING (%s) WITH CHECK (%s)',
          v_policy, v_expr, v_expr
        );
      ELSE
        EXECUTE format(
          'ALTER POLICY %I ON storage.objects USING (%s)',
          v_policy, v_expr
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skipped %: %', v_policy, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- 2. The proposal ping is not a button an owner can hold down -------------
--
-- The function is GRANT EXECUTE TO authenticated, so it is reachable directly
-- at /rest/v1/rpc/notify_event_proposal_submitted — which never passes through
-- the Server Action's per-user rate limiter. The `pending_review` check stops a
-- DRAFT being used this way, but nothing stopped the owner of a genuinely
-- pending event from calling it in a loop and inserting one `notifications`
-- row per admin per call.
--
-- Fixed the same way PR #18 fixed `request_booking`: refuse when the work has
-- already been done. One announcement per event per pending spell — a
-- withdraw-and-resubmit still notifies, because the earlier notification is
-- older than the resubmission.
CREATE OR REPLACE FUNCTION public.notify_event_proposal_submitted(p_event_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_id uuid;
  v_owner_id    uuid;
  v_status      text;
  v_name        text;
  v_shop        text;
  v_updated_at  timestamptz;
  v_count       integer := 0;
BEGIN
  SELECT e.business_id, e.status, e.name, e.updated_at
    INTO v_business_id, v_status, v_name, v_updated_at
  FROM public.events e
  WHERE e.id = p_event_id;

  IF NOT FOUND OR v_business_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT b.owner_id, b.shop_name INTO v_owner_id, v_shop
  FROM public.businesses b WHERE b.id = v_business_id;

  -- Only the shop's owner may announce their own proposal.
  IF v_owner_id IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'not authorized to notify for this event';
  END IF;

  -- Only a genuinely submitted event pings the queue. Without this the RPC is
  -- a free "notify every admin" button that a draft, or a resubmit loop, could
  -- hold down.
  IF v_status <> 'pending_review' THEN
    RETURN 0;
  END IF;

  -- Already announced for THIS submission. Compared against `updated_at`
  -- rather than "does any row exist", so withdrawing and resubmitting — which
  -- touches the row — legitimately notifies again, while a caller hammering
  -- the endpoint gets nothing after the first.
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.type = 'event_proposal_submitted'
      AND n.metadata->>'event_id' = p_event_id::text
      AND n.created_at >= v_updated_at
  ) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, business_id, actor_id, metadata)
  SELECT
    p.id,
    'event_proposal_submitted',
    'New event proposal',
    COALESCE(v_shop, 'A business') || ' submitted "' || v_name || '" for review.',
    v_business_id,
    (select auth.uid()),
    jsonb_build_object('event_id', p_event_id, 'event_name', v_name)
  FROM public.profiles p
  WHERE p.role = 'admin' AND p.archived_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_event_proposal_submitted(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_event_proposal_submitted(uuid) TO authenticated;

-- 3. Index the public search ----------------------------------------------
--
-- `/events?search=` runs `name.ilike.%…%,address.ilike.%…%` for ANONYMOUS
-- callers over every event on the platform — a global leading-wildcard search,
-- which is exactly the shape CLAUDE.md §API standards requires a
-- `gin_trgm_ops` index for, and the same reason `20260717075244` exists for
-- `profiles.full_name` / `email`.
--
-- The dashboard searches are deliberately NOT indexed here: both filter by an
-- indexed `business_id` (or are admin-only) first, so the trigram scan never
-- sees more than one shop's rows.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_events_name_trgm
  ON public.events USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_events_address_trgm
  ON public.events USING gin (address gin_trgm_ops);

-- 4. Index the review FK ---------------------------------------------------
--
-- Postgres does not auto-index foreign keys. `reviewed_by` is `ON DELETE SET
-- NULL`, so without this every `auth.users` delete sequentially scans `events`
-- to find the rows it has to clear. Partial, because the column is NULL for
-- everything that has not been decided yet.

CREATE INDEX IF NOT EXISTS idx_events_reviewed_by
  ON public.events (reviewed_by)
  WHERE reviewed_by IS NOT NULL;
