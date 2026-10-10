-- Registration funnel: how many business registrations a tracked link brings,
-- step by step — tap → signup → registration started → registration completed.
--
-- WHY: the mobile app links owners to /for-business, and nothing measured what
-- happened next. No third-party analytics: every step is already a row we own,
-- except the tap itself, which gets a minimal table here.
--
--   tap        registration_funnel_landings   (/for-business/go records it)
--   signup     auth.users metadata `signup_ref` (signupAction writes it)
--   started    businesses.signup_ref           (trigger below, at shop insert)
--   completed  businesses.registration_completed_at (complete_business_registration)
--
-- The ref crosses the email-confirmation hop inside the ACCOUNT, not a cookie:
-- the confirmation link often opens in a different browser.
--
-- A ref is `^[a-z0-9_]{1,40}$` everywhere (lib/utils/signupRef.ts mirrors it).
-- `signup_ref` lives in user-editable metadata, so an owner could relabel their
-- own attribution; nothing reads it but this report, so that is accepted.

-- 1. Taps. Written only through record_registration_landing(); no policies, so
--    neither anon nor authenticated can read or write the table directly.
CREATE TABLE IF NOT EXISTS public.registration_funnel_landings (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref        TEXT        NOT NULL CHECK (ref ~ '^[a-z0-9_]{1,40}$'),
  visitor_id UUID        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS registration_funnel_landings_ref_created_idx
  ON public.registration_funnel_landings (ref, created_at);

ALTER TABLE public.registration_funnel_landings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.registration_funnel_landings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_registration_landing(
  p_ref TEXT,
  p_visitor UUID
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  -- The CHECK rejects a malformed ref; the route validates before calling.
  INSERT INTO public.registration_funnel_landings (ref, visitor_id)
  VALUES (p_ref, p_visitor);
$function$;

REVOKE EXECUTE ON FUNCTION public.record_registration_landing(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_registration_landing(TEXT, UUID)
  TO anon, authenticated;

-- 2. The shop remembers which link its owner signed up through.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS signup_ref TEXT
  CHECK (signup_ref IS NULL OR signup_ref ~ '^[a-z0-9_]{1,40}$');

-- Copied from the owner's account at insert, never taken from the client.
-- A shop an admin creates from their own session carries no attribution; any
-- other insert takes whatever its OWNER signed up through (usually nothing).
CREATE OR REPLACE FUNCTION public.set_business_signup_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ref TEXT;
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT u.raw_user_meta_data ->> 'signup_ref'
    INTO v_ref
    FROM auth.users u
   WHERE u.id = NEW.owner_id;

  NEW.signup_ref := CASE WHEN v_ref ~ '^[a-z0-9_]{1,40}$' THEN v_ref END;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_business_signup_ref ON public.businesses;
CREATE TRIGGER set_business_signup_ref
  BEFORE INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_business_signup_ref();

-- 3. The report. Reads auth.users, so it is for admins and privileged sessions
--    only — an admin user, the service role, or a direct database session such
--    as the SQL editor (no JWT, so auth.role() is NULL). `is_admin()` alone is
--    not that check: it is false whenever there is no signed-in user.
--      SELECT * FROM public.registration_funnel_report();          -- 30 days
--      SELECT * FROM public.registration_funnel_report(now() - interval '7 days');
--
-- Each step counts the events that happened inside the window (taps by tap
-- time, signups by account creation, shops by creation), so a long window
-- reads as a funnel; a short one can show a signup whose tap fell before it.
CREATE OR REPLACE FUNCTION public.registration_funnel_report(
  p_since TIMESTAMPTZ DEFAULT now() - interval '30 days'
)
RETURNS TABLE (
  ref       TEXT,
  taps      BIGINT,
  visitors  BIGINT,
  signups   BIGINT,
  started   BIGINT,
  completed BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT (public.is_admin() OR coalesce(auth.role(), 'service_role') = 'service_role') THEN
    RAISE EXCEPTION 'registration_funnel_report is admin-only'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH landings AS (
    SELECT l.ref, count(*) AS taps, count(DISTINCT l.visitor_id) AS visitors
      FROM public.registration_funnel_landings l
     WHERE l.created_at >= p_since
     GROUP BY l.ref
  ), signups AS (
    SELECT u.raw_user_meta_data ->> 'signup_ref' AS ref, count(*) AS signups
      FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
     WHERE p.role = 'business_owner'
       AND u.created_at >= p_since
       AND u.raw_user_meta_data ->> 'signup_ref' ~ '^[a-z0-9_]{1,40}$'
     GROUP BY 1
  ), shops AS (
    SELECT b.signup_ref AS ref,
           count(*) AS started,
           count(b.registration_completed_at) AS completed
      FROM public.businesses b
     WHERE b.signup_ref IS NOT NULL
       AND b.created_at >= p_since
     GROUP BY b.signup_ref
  )
  SELECT r.ref,
         coalesce(l.taps, 0),
         coalesce(l.visitors, 0),
         coalesce(s.signups, 0),
         coalesce(b.started, 0),
         coalesce(b.completed, 0)
    FROM (SELECT landings.ref FROM landings
          UNION SELECT signups.ref FROM signups
          UNION SELECT shops.ref FROM shops) r
    LEFT JOIN landings l ON l.ref = r.ref
    LEFT JOIN signups  s ON s.ref = r.ref
    LEFT JOIN shops    b ON b.ref = r.ref
   ORDER BY coalesce(l.taps, 0) DESC, r.ref;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.registration_funnel_report(TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registration_funnel_report(TIMESTAMPTZ)
  TO authenticated, service_role;
