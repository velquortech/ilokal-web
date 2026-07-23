-- Registration gating flags (see .claude/REGISTRATION_GATING.md)
--
-- 1. app_settings — generic platform key/value flags, admin-managed.
-- 2. get_app_setting_bool() — safe reader with default.
-- 3. set_business_initial_status() — BEFORE INSERT trigger on businesses:
--    non-admin inserts get their status forced from the auto_verify_businesses
--    flag ('verified' when ON, 'pending' when OFF). This also closes a gap
--    where the owner-scoped "Owners manage own business" FOR ALL policy let a
--    non-admin insert a business with status='verified' via direct PostgREST.
--    Admin/service-role inserts keep their explicit status (is_admin() returns
--    true for both). Normal (O-enabled) trigger on purpose: seeds run under
--    session_replication_role = replica and keep their explicit statuses.

-- 1. Table ---------------------------------------------------------------

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Registration UI (any signed-in user) needs to read the flags; writes are
-- admin-only. Wrapped calls per the RLS initPlan standard.
CREATE POLICY "Authenticated read app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage app settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE TRIGGER handle_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- MVP defaults: no documents required, auto-verify ON.
INSERT INTO public.app_settings (key, value) VALUES
  ('require_business_documents', 'false'::jsonb),
  ('auto_verify_businesses', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Reader helper -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_app_setting_bool(
  p_key text,
  p_default boolean
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT (value #>> '{}')::boolean FROM public.app_settings WHERE key = p_key),
    p_default
  );
$$;

REVOKE ALL ON FUNCTION public.get_app_setting_bool(text, boolean)
  FROM PUBLIC, anon, authenticated;

-- 3. Initial-status trigger ----------------------------------------------

CREATE OR REPLACE FUNCTION public.set_business_initial_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Admins and the service role (is_admin() = true when auth.uid() IS NULL)
  -- keep whatever status they set explicitly.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF public.get_app_setting_bool('auto_verify_businesses', false) THEN
    NEW.status := 'verified';
  ELSE
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_business_initial_status()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_set_business_initial_status
  BEFORE INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_business_initial_status();
