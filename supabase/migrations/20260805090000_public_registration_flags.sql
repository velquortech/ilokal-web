-- Expose the two registration flags to anonymous readers, and make a
-- malformed flag row incapable of taking the others down with it.
--
-- ⚠️ NEEDS HUMAN APPROVAL BEFORE MERGE (function change), then
-- `make migrate-cloud` + a `supabase_migrations.schema_migrations` ledger
-- reconcile. **The cloud apply should land before the app deploy** — the app
-- tolerates the other order (it falls back to the table read for authenticated
-- callers), but until this is applied an anonymous visitor sees the strict
-- copy. Applied on LOCAL ONLY so far. No table, policy or column change.
--
-- WHY: `app_settings` is readable `TO authenticated` only, so an anonymous
-- request to `getRegistrationSettings()` gets **zero rows and no error** and
-- falls back to the strict legacy defaults — documents required, no
-- auto-verify. That was invisible while both callers were behind auth. The new
-- public `/for-business` page is not: it told every logged-out visitor they
-- needed a business permit and a 24–48 hour review, while the database said
-- neither is true. Verified in a production build before this migration.
--
-- Widening the EXISTING `public_feature_flags()` rather than adding an anon
-- SELECT policy on `app_settings`: the function's return list is the contract,
-- so it exposes exactly these four booleans and nothing else, and a future
-- settings row stays private by default. Same reason the events work put the
-- other two here instead of opening the table (a `USING (true)` read on a
-- settings table is how the follow graph leaked in `20260607000000`).

BEGIN;

-- ── the value cast, made total ───────────────────────────────────────────────
-- `(value #>> '{}')::boolean` accepts far more than a JSON boolean: Postgres
-- casts 'yes', 'on' and '1' to true, so a mis-typed row could turn a flag ON
-- where the old TypeScript `typeof value === 'boolean'` check refused it. Worse,
-- a genuinely uncastable value ('"maybe"', 5) raises 22P02 — and because all
-- four flags now come from ONE function call, a single bad registration row
-- would blank `enable_events` and `enable_bookings` for every anonymous
-- visitor. Only a real JSON boolean counts now; anything else takes the
-- default, which is always the stricter answer.
CREATE OR REPLACE FUNCTION public.get_app_setting_bool(p_key text, p_default boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT CASE WHEN jsonb_typeof(value) = 'boolean' THEN value::boolean END
      FROM public.app_settings
      WHERE key = p_key
    ),
    p_default
  );
$$;

-- ── the public flag set ──────────────────────────────────────────────────────
-- DROP first: Postgres refuses to change a function's return type through
-- CREATE OR REPLACE (42P13), and this adds two columns to the returned row.
-- Inside the transaction above, so there is no window where the function is
-- missing and every anonymous caller gets PGRST202 — which would fail all four
-- flags closed at once. The grants AND the owner are re-issued because a drop
-- takes both with it, and the owner matters here: this is SECURITY DEFINER and
-- it calls `get_app_setting_bool`, whose EXECUTE is revoked from anon.
DROP FUNCTION IF EXISTS public.public_feature_flags();

CREATE FUNCTION public.public_feature_flags()
RETURNS TABLE (
  enable_events              boolean,
  enable_bookings            boolean,
  require_business_documents boolean,
  auto_verify_businesses     boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.get_app_setting_bool('enable_events', false),
    public.get_app_setting_bool('enable_bookings', false),
    -- Strict fallbacks, matching `getRegistrationSettings`'s own: an
    -- unreadable flag must not advertise a laxer flow than the wizard runs.
    public.get_app_setting_bool('require_business_documents', true),
    public.get_app_setting_bool('auto_verify_businesses', false);
$$;

ALTER FUNCTION public.public_feature_flags() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.public_feature_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_feature_flags() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.public_feature_flags() IS
  'Anon-safe feature flags. The return list is the contract: only these four booleans are public, and a new app_settings row stays private unless this signature is deliberately widened.';

COMMIT;
