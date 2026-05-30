-- Phase 2: sync profiles.role + profiles.status into auth.users.raw_app_meta_data
-- so middleware can read role/status from the session JWT instead of doing a
-- separate profiles SELECT on every protected page navigation.
--
-- Rollback: DROP TRIGGER on_profile_role_change ON public.profiles;
--           DROP FUNCTION sync_role_to_jwt();
-- After rollback, proxy.ts falls back to the existing profiles SELECT path.

CREATE OR REPLACE FUNCTION sync_role_to_jwt()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  -- COALESCE guards against NULL raw_app_meta_data: NULL || jsonb = NULL in Postgres
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('role', NEW.role, 'status', NEW.status)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_role_change
  AFTER INSERT OR UPDATE OF role, status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION sync_role_to_jwt();

-- One-time backfill wrapped in a SECURITY DEFINER helper so it runs with the
-- same elevated privileges as the trigger (plain DML runs as the migration
-- runner, which may lack UPDATE on auth.users in hosted Supabase).
CREATE OR REPLACE FUNCTION _run_role_backfill()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users u
  SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('role', p.role, 'status', p.status)
  FROM public.profiles p
  WHERE p.id = u.id;
END;
$$;

SELECT _run_role_backfill();
DROP FUNCTION IF EXISTS _run_role_backfill();
