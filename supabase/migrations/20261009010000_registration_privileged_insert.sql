-- Privileged business inserts keep what they write.
--
-- WHY: `set_business_initial_status()` lets "admins and the service role" keep
-- an explicit status, but tested that with `is_admin()` alone, on the belief
-- that it is true when auth.uid() IS NULL. It is not: `is_admin()` looks up the
-- signed-in user's profile, so with no user it is FALSE. Since 20260723 every
-- seed, SQL-editor and service-role insert has therefore been treated as an
-- owner registration. 20261009000000 made that fatal: such rows now start
-- `pending` with `registration_completed_at` NULL, and the
-- verified-requires-completion CHECK means they can never be published —
-- after a `db reset` every seeded shop is hidden, and every listing
-- scripts/import-directory.mjs writes with the service-role key is invisible.
--
-- `is_privileged_session()` names the check once:
--   - an admin user (is_admin()),
--   - the service role (JWT role 'service_role'),
--   - a direct database session — seeds, the SQL editor, migrations, cron —
--     which carries no JWT at all, so auth.role() is NULL.
-- PostgREST always sets the JWT role, so anon and signed-in users can never
-- look like a direct session. Owner registration inserts through the owner's
-- own session (lib/api/business/business.ts), so it stays gated exactly as
-- before.

CREATE OR REPLACE FUNCTION public.is_privileged_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT public.is_admin()
      OR coalesce(auth.role(), 'service_role') = 'service_role';
$function$;

REVOKE ALL ON FUNCTION public.is_privileged_session()
  FROM PUBLIC, anon, authenticated;

-- Same body as 20261009000000; only the privileged check changes.
CREATE OR REPLACE FUNCTION public.set_business_initial_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Admins, the service role and direct database sessions keep whatever
  -- status they set explicitly, and the column default marks their rows
  -- complete.
  IF public.is_privileged_session() THEN
    RETURN NEW;
  END IF;

  -- `auto_verify_businesses` is applied by complete_business_registration(),
  -- once every part of the registration has been saved.
  NEW.status := 'pending';
  NEW.registration_completed_at := NULL;

  RETURN NEW;
END;
$function$;
