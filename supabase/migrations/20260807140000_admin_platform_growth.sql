-- ============================================================
-- Platform growth for the admin dashboard
-- ------------------------------------------------------------
-- The dashboard's growth chart was computing monthly buckets in Node: two
-- head-only counts per month, twelve PostgREST round trips for a six-month
-- window, on every render (the route is dynamic).
--
-- Counts avoid the 1000-row truncation a fetch-then-group would hit, so that
-- version was CORRECT — but it was twelve sequential scans, and under RLS each
-- one evaluates `is_admin()` per row scanned. `profiles` carries two admin ALL
-- policies, so that cost is paid twice. One grouped scan in SQL replaces all
-- of it, which is what "aggregations belong in SQL, not Node" is for.
--
-- Two things here:
--   1. `analytics_platform_growth` — one call, one scan per table.
--   2. Indexes on the two `created_at` columns. Postgres does not auto-index
--      them, and they are the filter for this RPC AND for the existing
--      `getUserMetrics` / `getAdminDashboardSummary` 30-day windows.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.analytics_platform_growth(integer);
--   DROP INDEX IF EXISTS public.idx_profiles_created_at;
--   DROP INDEX IF EXISTS public.idx_businesses_created_at;
-- ============================================================

-- ─────────────────────────── indexes ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
  ON public.profiles (created_at);

CREATE INDEX IF NOT EXISTS idx_businesses_created_at
  ON public.businesses (created_at);

-- ─────────────────────── the growth aggregate ───────────────────
--
-- Months are bucketed in **Asia/Manila**, not the server's zone. Postgres runs
-- UTC here, so `date_trunc('month', created_at)` would file the first eight
-- hours of every Manila month into the previous one. `AT TIME ZONE 'Asia/Manila'`
-- converts the timestamptz to Manila wall-clock before truncating, which is the
-- same rule the app applies to shop hours, events and deal cards.
--
-- Archived rows are excluded so the chart agrees with the stat cards beside it:
-- a soft-deleted account or shop is not a signup anyone should be counting.
CREATE OR REPLACE FUNCTION public.analytics_platform_growth(
  p_months INTEGER DEFAULT 6
)
RETURNS TABLE (
  month_start DATE,
  users       BIGINT,
  businesses  BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  WITH bounds AS (
    -- Clamped in SQL as well as in the caller: this is the layer that decides
    -- how much work the database does, so it cannot rely on the client asking
    -- politely.
    SELECT LEAST(GREATEST(COALESCE(p_months, 6), 1), 24) AS n
  ),
  months AS (
    SELECT (
      date_trunc('month', (now() AT TIME ZONE 'Asia/Manila'))
      - make_interval(months => g)
    )::date AS month_start
    FROM bounds, generate_series((SELECT n FROM bounds) - 1, 0, -1) AS g
  )
  SELECT
    m.month_start,
    (
      SELECT count(*)
      FROM public.profiles p
      WHERE p.archived_at IS NULL
        AND date_trunc('month', (p.created_at AT TIME ZONE 'Asia/Manila'))::date
            = m.month_start
    ) AS users,
    (
      SELECT count(*)
      FROM public.businesses b
      WHERE b.archived_at IS NULL
        AND date_trunc('month', (b.created_at AT TIME ZONE 'Asia/Manila'))::date
            = m.month_start
    ) AS businesses
  FROM months m
  ORDER BY m.month_start;
$$;

-- Reads every profile and every business on the platform, so it is
-- service_role only and the caller proves the user is an admin BEFORE the
-- RLS-bypassing call — the same contract as every other `analytics_*` function.
REVOKE EXECUTE ON FUNCTION public.analytics_platform_growth(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_platform_growth(INTEGER)
  TO service_role;

COMMENT ON FUNCTION public.analytics_platform_growth(INTEGER) IS
  'New profiles and businesses per calendar month, bucketed in Asia/Manila. '
  'Admin dashboard only: service_role EXECUTE, caller must verify the admin '
  'role first. Archived rows excluded so the chart agrees with the stat cards.';
