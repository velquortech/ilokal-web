-- Fix (SB-A, .claude/SIGNUP_BUSINESS_TAB.md): business signups were stored as
-- 'app_user'.
--
-- Chain: handle_new_user hardcoded role='app_user' on the auth.users INSERT
-- trigger, and the signup action's follow-up role self-upsert is (correctly)
-- reverted by the SEC-1 trigger prevent_profile_self_privilege (20260717000001)
-- -- the old flow only worked by riding the privilege-escalation hole SEC-1
-- closed. Role assignment must happen in a privileged path: this trigger.
--
-- The signup action now passes the chosen role via
-- auth.signUp({ options: { data: { role, full_name } } }) and this function
-- reads it through an ALLOWLIST: only the two self-service roles are honored;
-- anything else (including a forged 'admin') falls back to 'app_user'. Admin
-- accounts are created by admins, never by signup metadata. The
-- sync_role_to_jwt trigger fires on this INSERT, so the JWT carries the
-- correct role immediately.
--
-- Rollback: re-apply the 20260508000006 function body (hardcoded 'app_user').

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.raw_user_meta_data->>'role' IN ('app_user', 'business_owner')
         THEN NEW.raw_user_meta_data->>'role'
         ELSE 'app_user' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
