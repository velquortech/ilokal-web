-- ============================================================
-- Date planner — atomic stop replacement
-- (docs/superpowers/specs/2026-08-22-date-planner-design.md)
-- ------------------------------------------------------------
-- PUT /api/protected/mobile/plans/:planId replaces a plan's whole
-- ordered stop list. Expressed as separate PostgREST calls that is
-- UPDATE, then DELETE, then INSERT — three round trips, three
-- transactions. A failure after the DELETE leaves the plan with no
-- stops at all and returns a 500: the user loses the outing they
-- were only trying to reorder.
--
-- A plpgsql function fixes that for free. Postgres runs a function
-- call inside the calling statement's transaction, so the whole
-- delete-then-insert either lands or rolls back as one unit.
--
-- SECURITY INVOKER (the default — stated here because it is the
-- security decision, not an oversight). A SECURITY DEFINER function
-- would run as the owner and BYPASS the RLS policies that make a
-- plan private, turning one bad p_plan_id into a cross-tenant write.
-- Running as the invoker keeps `plans` and `plan_stops` RLS in force,
-- so this function can only ever touch rows the caller already owns.
-- The explicit `user_id = auth.uid()` filter below is belt-and-braces
-- on top of that, matching how every protected mobile route scopes.
--
-- Business existence is left to the plan_stops.business_id foreign
-- key rather than a pre-flight SELECT. The pre-flight version was
-- RLS-blind in the wrong direction: `businesses` is only publicly
-- readable while `status = 'verified' AND archived_at IS NULL`, so a
-- shop that lost verification after being added read as "does not
-- exist", 400'd the whole save, and — because the client had already
-- dropped the invisible stop from its list — silently deleted it.
-- The FK answers the question that was actually being asked (does
-- this row exist?) without consulting visibility, and raises 23503
-- inside the transaction, so nothing partial is ever written.
-- ============================================================

CREATE OR REPLACE FUNCTION public.replace_plan_stops(
  p_plan_id     uuid,
  p_title       text,
  p_target_date date,
  p_stops       jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE plans
     SET title       = p_title,
         target_date = p_target_date,
         updated_at  = now()
   WHERE id = p_plan_id
     AND user_id = auth.uid();

  -- No row updated means the plan is missing OR owned by someone else.
  -- Deliberately one indistinguishable outcome: the route maps this to
  -- 404 so a probe can never tell another user's plan id from a
  -- nonexistent one.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  DELETE FROM plan_stops WHERE plan_id = p_plan_id;

  -- The array's order IS the stored position; WITH ORDINALITY supplies
  -- it, so position 0..n-1 cannot drift from what the client sent.
  INSERT INTO plan_stops (plan_id, business_id, stop_time, position)
  SELECT p_plan_id,
         (elem ->> 'business_id')::uuid,
         NULLIF(elem ->> 'stop_time', '')::time,
         (ord - 1)::int
    FROM jsonb_array_elements(COALESCE(p_stops, '[]'::jsonb))
         WITH ORDINALITY AS t(elem, ord);
END;
$$;

COMMENT ON FUNCTION public.replace_plan_stops(uuid, text, date, jsonb) IS
  'Atomically replace a plan''s title, date, and ordered stop list. '
  'SECURITY INVOKER so plans/plan_stops RLS still restricts to the owner.';

REVOKE ALL ON FUNCTION public.replace_plan_stops(uuid, text, date, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_plan_stops(uuid, text, date, jsonb) TO authenticated;
