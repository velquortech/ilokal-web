-- SECURITY (CRITICAL): close the profiles self-privilege-escalation hole.
-- See .claude/PERFORMANCE_AUDIT.md (S1 / SEC-1).
--
-- The self-update policy is `USING (auth.uid()=id) WITH CHECK (auth.uid()=id)`
-- with NO column guard. A normal user, using the public anon key + their own
-- JWT, can call PostgREST directly:
--     PATCH /rest/v1/profiles?id=eq.<self>   {"role":"admin"}
-- RLS passes, the row updates, and on the next session refresh the
-- sync_role_to_jwt trigger mints an admin JWT — full admin takeover.
--
-- Fix: a BEFORE UPDATE trigger enforcing, for a NON-admin editing their OWN row:
--   • role        — never self-changeable (the escalation vector). Always revert.
--   • status      — may move only between 'active' and 'inactive' (self-service
--                   deactivate/reactivate). May NOT transition OUT of 'suspended'
--                   (admin moderation) — closes the direct-PostgREST self-unban.
--   • archived_at — may be SET (self-delete/archive) but never CLEARED
--                   (no self un-delete) — closes the direct-PostgREST un-archive.
-- Admins and the service role (is_admin() true, or auth.uid() NULL) are
-- unaffected, so the admin console and server flows keep working. This mirrors
-- the guards already in the mobile /me deactivate/reactivate/delete routes,
-- moving them to the DB so a direct PostgREST call can't bypass them. The /me
-- PATCH path only touches full_name/phone_number/avatar_url — unaffected.
--
-- Rollback:
--   DROP TRIGGER trg_prevent_profile_self_privilege ON public.profiles;
--   DROP FUNCTION public.prevent_profile_self_privilege();

CREATE OR REPLACE FUNCTION public.prevent_profile_self_privilege()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := (select auth.uid());
BEGIN
  -- Service role (no JWT) and admins may change anything.
  IF v_uid IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admin editing someone else's row: RLS already blocks this; nothing to do.
  IF v_uid <> NEW.id THEN
    RETURN NEW;
  END IF;

  -- Non-admin editing their OWN row: guard privileged columns.

  -- role: never self-changeable (privilege-escalation vector).
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;

  -- status: allow only active <-> inactive; never leave 'suspended' (admin
  -- moderation) and never self-assign 'suspended'.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'suspended' OR NEW.status NOT IN ('active', 'inactive') THEN
      NEW.status := OLD.status;
    END IF;
  END IF;

  -- archived_at: may be set (self-archive) but never cleared (no self un-delete).
  IF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN
    NEW.archived_at := OLD.archived_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_self_privilege ON public.profiles;
CREATE TRIGGER trg_prevent_profile_self_privilege
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_self_privilege();
