-- Expose the two registration flags to anonymous readers.
--
-- ⚠️ NEEDS HUMAN APPROVAL BEFORE MERGE (function change), then
-- `make migrate-cloud` + a `supabase_migrations.schema_migrations` ledger
-- reconcile. Applied on LOCAL ONLY so far. No table, policy or column change.
--
-- WHY: `app_settings` is readable `TO authenticated` only, so an anonymous
-- request to `getRegistrationSettings()` gets **zero rows and no error** and
-- falls back to the strict legacy defaults — documents required, no
-- auto-verify. That was invisible while both callers were behind auth. The new
-- public `/for-business` page is not: it told every logged-out visitor they
-- needed a business permit and a 24–48 hour review, while the database said
-- neither is true. Verified in a production build before this migration: the
-- rows read `false` / `true`, the page rendered "business permit" and "Then we
-- review it".
--
-- Widening the EXISTING `public_feature_flags()` rather than adding an anon
-- SELECT policy on `app_settings`: the function's return list is the contract,
-- so it can expose exactly these four booleans and nothing else, and a future
-- settings row stays private by default. Same reason the events work put the
-- other two here instead of opening the table (a `USING (true)` read on a
-- settings table is how the follow graph leaked in `20260607000000`).
--
-- The defaults below MATCH `getRegistrationSettings`'s own fallbacks, so a
-- missing row still means "stricter", never "looser".

-- DROP first: Postgres refuses to change a function's return type through
-- CREATE OR REPLACE (42P13), and this adds two columns to the returned row.
-- The grants below are re-issued because a drop takes them with it.
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
    -- Strict fallbacks: an unreadable flag must not advertise a laxer flow
    -- than the wizard actually runs.
    public.get_app_setting_bool('require_business_documents', true),
    public.get_app_setting_bool('auto_verify_businesses', false);
$$;

REVOKE ALL ON FUNCTION public.public_feature_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_feature_flags() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.public_feature_flags() IS
  'Anon-safe feature flags. The return list is the contract: only these four booleans are public, and a new app_settings row stays private unless this signature is deliberately widened.';
