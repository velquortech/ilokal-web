-- ============================================================================
-- Registration follow-up: the read side + the "nudged" marker.
--
-- Backs the admin surface that lists owners who created an account but never
-- finished registering a shop, so an admin can email each one a reminder.
-- Measured 2026-08-22: 41 live business_owner accounts, 21 businesses — 49% of
-- owners never produce a business row, and until now the product had no way to
-- reach them. See `.claude/REGISTRATION_FUNNEL.md` (P7).
--
-- Mirrors `20260806090000_menu_followup.sql` deliberately, function for
-- function: page / uncapped stats / id-array for "send to all". Same reasons,
-- and the admin UI is the same page with a second tab.
--
-- 🔴 THE MARKER LIVES ON `profiles`, NOT `businesses`. The whole cohort is
-- owners with NO business row, so there is no business to hang it on — and
-- putting it there would have made this depend on the server-side-draft phase
-- landing first.
--
-- HIGH risk by policy: new SECURITY DEFINER functions that read EVERY owner's
-- email, plus a schema column. Applied to NEITHER local nor cloud yet. Needs
-- human approval before merge, then `make migrate-cloud` + a ledger reconcile.
-- Additive: nullable column, no backfill, no new policy, no existing behaviour
-- changed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The marker.
--
-- Nullable, no default, no backfill: NULL means "never reminded". A
-- `DEFAULT now()` would claim every existing owner had already been nudged.
--
-- No new RLS policy. The SEC-1 BEFORE UPDATE trigger on `profiles`
-- (`20260717000001`) guards `role`/`status`/`archived_at` against non-admin
-- self-edits and does not touch this column, and the admin send path writes
-- through the service-role client, which bypasses RLS entirely. An owner being
-- able to clear their own reminder marker is not a privilege worth a policy —
-- it is advisory bookkeeping, not a gate.
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.profiles.registration_reminder_sent_at IS
  'When the last "finish registering your shop" reminder email was sent. NULL = never. Written only by the admin follow-up send path (service role).';

-- ----------------------------------------------------------------------------
-- 2. The list.
--
-- SECURITY DEFINER because it reads EVERY owner's email from profiles — an
-- admin caller has no RLS path to another user's email.
--
-- The cohort: role = 'business_owner', not archived, and NO non-archived
-- business row. Archived businesses are deliberately NOT disqualifying — an
-- owner whose only shop was archived is back to having nothing live, which is
-- the state this nudge addresses. `had_business` distinguishes the two so the
-- email copy can, later, tell "never started" from "started and lost it".
--
-- `furthest_step` comes from `owner_events`, which only began recording on
-- 2026-08-15 — so it is NULL for most of the existing backlog and that is
-- honest rather than broken. It becomes the useful column going forward, and
-- especially once the Next button stopped being disabled (funnel phase 0), since
-- `reg_step_error` can finally record where owners stall.
--
-- EXECUTE is revoked from everyone and granted to service_role only; the
-- calling Server Action verifies admin BEFORE using the service-role client.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_owners_missing_business(
  p_search       text    DEFAULT NULL,
  p_only_started boolean DEFAULT false,
  p_limit        integer DEFAULT 50,
  p_offset       integer DEFAULT 0
)
RETURNS TABLE (
  id                           uuid,
  owner_email                  text,
  owner_name                   text,
  signed_up_at                 timestamptz,
  furthest_step                integer,
  last_activity_at             timestamptz,
  had_business                 boolean,
  registration_reminder_sent_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id,
    p.email                       AS owner_email,
    p.full_name                   AS owner_name,
    p.created_at                  AS signed_up_at,
    ev.furthest_step,
    ev.last_activity_at,
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = p.id
    )                             AS had_business,
    p.registration_reminder_sent_at
  FROM public.profiles p
  -- LATERAL, not a GROUP BY join: one indexed pass per candidate row
  -- (idx_owner_events_owner_time) instead of aggregating the whole event table
  -- and joining the result.
  LEFT JOIN LATERAL (
    SELECT
      max((oe.payload ->> 'step')::int) AS furthest_step,
      max(oe.created_at)                AS last_activity_at
    FROM public.owner_events oe
    WHERE oe.owner_id = p.id
      AND oe.event IN ('reg_step_viewed', 'reg_step_completed', 'reg_step_error')
      -- A malformed payload must not abort the whole listing.
      AND oe.payload ->> 'step' ~ '^[0-9]+$'
  ) ev ON true
  WHERE p.role = 'business_owner'
    AND p.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = p.id
        AND b.archived_at IS NULL
    )
    AND (
      p_search IS NULL
      OR p.full_name ILIKE '%' || p_search || '%'
      OR p.email     ILIKE '%' || p_search || '%'
    )
    -- "Started" = they got far enough into the wizard to emit an event. The
    -- warmest leads in the list, and the only ones whose drop-off point we know.
    AND (NOT p_only_started OR ev.furthest_step IS NOT NULL)
  ORDER BY p.created_at ASC NULLS LAST, p.id ASC
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION
  public.admin_owners_missing_business(text, boolean, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.admin_owners_missing_business(text, boolean, integer, integer)
  TO service_role;

COMMENT ON FUNCTION
  public.admin_owners_missing_business(text, boolean, integer, integer) IS
  'Admin-only (service_role): ONE PAGE of business_owner accounts with no live shop, with owner email and their furthest wizard step. Caller must verify admin before invoking.';

-- ----------------------------------------------------------------------------
-- 3. Stat totals — uncapped COUNTs, so the cards never under-read past 1000.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_owners_missing_business_stats(
  p_search       text    DEFAULT NULL,
  p_only_started boolean DEFAULT false
)
RETURNS TABLE (
  total    bigint,
  started  bigint,
  reminded bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH candidates AS (
    SELECT
      p.id,
      p.registration_reminder_sent_at,
      EXISTS (
        SELECT 1 FROM public.owner_events oe
        WHERE oe.owner_id = p.id
          AND oe.event IN ('reg_step_viewed', 'reg_step_completed', 'reg_step_error')
      ) AS started
    FROM public.profiles p
    WHERE p.role = 'business_owner'
      AND p.archived_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.owner_id = p.id
          AND b.archived_at IS NULL
      )
      AND (
        p_search IS NULL
        OR p.full_name ILIKE '%' || p_search || '%'
        OR p.email     ILIKE '%' || p_search || '%'
      )
  )
  SELECT
    count(*) FILTER (WHERE NOT p_only_started OR started)              AS total,
    count(*) FILTER (WHERE started)                                    AS started,
    count(*) FILTER (
      WHERE registration_reminder_sent_at IS NOT NULL
        AND (NOT p_only_started OR started)
    )                                                                  AS reminded
  FROM candidates;
$$;

REVOKE ALL ON FUNCTION
  public.admin_owners_missing_business_stats(text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.admin_owners_missing_business_stats(text, boolean)
  TO service_role;

COMMENT ON FUNCTION
  public.admin_owners_missing_business_stats(text, boolean) IS
  'Admin-only (service_role): uncapped counts for the registration follow-up stat cards.';

-- ----------------------------------------------------------------------------
-- 4. The id set for "send to all" — a single-row uuid[] (NOT a table), so it is
--    not subject to PostgREST's row cap. Derived server-side so the button
--    never trusts a client-supplied, page-capped list.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_owners_missing_business_ids(
  p_search       text    DEFAULT NULL,
  p_only_started boolean DEFAULT false
)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(array_agg(p.id ORDER BY p.created_at ASC NULLS LAST, p.id ASC), '{}')
  FROM public.profiles p
  WHERE p.role = 'business_owner'
    AND p.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.owner_id = p.id
        AND b.archived_at IS NULL
    )
    AND (
      p_search IS NULL
      OR p.full_name ILIKE '%' || p_search || '%'
      OR p.email     ILIKE '%' || p_search || '%'
    )
    AND (
      NOT p_only_started
      OR EXISTS (
        SELECT 1 FROM public.owner_events oe
        WHERE oe.owner_id = p.id
          AND oe.event IN ('reg_step_viewed', 'reg_step_completed', 'reg_step_error')
      )
    );
$$;

REVOKE ALL ON FUNCTION
  public.admin_owners_missing_business_ids(text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.admin_owners_missing_business_ids(text, boolean)
  TO service_role;

COMMENT ON FUNCTION
  public.admin_owners_missing_business_ids(text, boolean) IS
  'Admin-only (service_role): all matching owner ids for "send to all", server-derived so the button never trusts a page-capped client list.';
