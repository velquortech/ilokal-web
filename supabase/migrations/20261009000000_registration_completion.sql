-- Keep a newly registered shop hidden until its registration is complete.
--
-- WHY: registration is several requests — create the row, then upload the
-- logo, banner and interior photos one at a time, then write the offerings and
-- the optional deal. `set_business_initial_status` used to apply the
-- `auto_verify_businesses` flag at INSERT, so the row was `verified` (public)
-- from the first request. One failed upload left a live shop with no photos
-- and an empty catalogue in front of shoppers; observed locally 2026-10-09.
--
-- `verified` is already THE visibility gate (the public RLS policies on
-- businesses, branches, products, coupons, posts, sections and events, every
-- nearby/search RPC, the mobile API). So rather than teach every reader about
-- a new state, the shop simply does not become `verified` until registration
-- completes:
--
--   1. `registration_completed_at` — NULL while the owner is still registering.
--   2. An owner's INSERT always starts `pending` with the column NULL.
--   3. `complete_business_registration()` — the wizard's last call — checks the
--      saved row really is complete, stamps the column, and only THEN applies
--      `auto_verify_businesses`.
--   4. A CHECK makes `verified` unreachable while the column is NULL, so no
--      path (an admin approving from the review queue included) can publish a
--      half-saved shop.

-- 1. The column. DEFAULT now() fills every existing row in one constant-time
--    step — no UPDATE, so no trigger fires and no `updated_at` is bumped. Every
--    existing row is a finished registration or an admin/directory listing, and
--    admin + seed inserts keep the default (the trigger below skips admins).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS registration_completed_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN public.businesses.registration_completed_at IS
  'NULL while the owner is still registering; set by complete_business_registration(). A business cannot be verified (public) while NULL.';

-- 4 (declared early so it guards the functions below from the start).
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_verified_requires_registration;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_verified_requires_registration
  CHECK (status <> 'verified' OR registration_completed_at IS NOT NULL);

-- 2. An owner's insert is the START of a registration, never its end.
CREATE OR REPLACE FUNCTION public.set_business_initial_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Admins and the service role (is_admin() = true when auth.uid() IS NULL)
  -- keep whatever status they set explicitly, and the column default marks
  -- their rows complete.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- `auto_verify_businesses` is applied by complete_business_registration(),
  -- once every part of the registration has been saved.
  NEW.status := 'pending';
  NEW.registration_completed_at := NULL;

  RETURN NEW;
END;
$function$;

-- 3. The wizard's final call.
CREATE OR REPLACE FUNCTION public.complete_business_registration(
  p_business_id UUID
)
RETURNS public.verification_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  b public.businesses%ROWTYPE;
  missing TEXT[] := '{}';
BEGIN
  SELECT * INTO b
    FROM public.businesses
   WHERE id = p_business_id
     AND owner_id = auth.uid()
     AND archived_at IS NULL
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent: a retried call (the response was lost, the owner pressed
  -- Submit again) returns the status the first call reached. It must NEVER
  -- re-apply auto-verify — that would let an owner re-publish a shop an
  -- admin has since suspended or rejected.
  IF b.registration_completed_at IS NOT NULL THEN
    RETURN b.status;
  END IF;

  -- The server's own check of what the wizard requires; the client's is a
  -- convenience. Mirrors the step schemas and the documents flag.
  IF b.logo_url IS NULL THEN
    missing := missing || 'shop logo'::TEXT;
  END IF;
  -- A custom banner is optional; bannerless shops display the static iLokal
  -- artwork in the web UI and keep banner_url NULL.
  IF COALESCE(cardinality(b.interior_images), 0) < 1 THEN
    missing := missing || 'at least one interior photo'::TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.products p
     WHERE p.business_id = b.id AND p.archived_at IS NULL
  ) THEN
    missing := missing || 'at least one offering'::TEXT;
  END IF;
  IF public.get_app_setting_bool('require_business_documents', true)
     AND NOT (b.verification_documents ? 'business_license'
              AND b.verification_documents ? 'tax_certificate') THEN
    missing := missing || 'business documents'::TEXT;
  END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Registration is incomplete: %',
      array_to_string(missing, ', ')
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.businesses
     SET registration_completed_at = now(),
         status = CASE
           WHEN public.get_app_setting_bool('auto_verify_businesses', false)
             THEN 'verified'::public.verification_status
           ELSE status
         END
   WHERE id = b.id
  RETURNING status INTO b.status;

  RETURN b.status;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_business_registration(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_business_registration(UUID)
  TO authenticated;

-- Keep the Beta grant exactly as it behaved before this migration. Auto-verify
-- used to happen at INSERT, which this AFTER UPDATE trigger never sees, so an
-- auto-verified shop was never granted Beta (0 of 23 locally on 2026-10-09).
-- Completion now verifies via UPDATE; without this guard every new shop would
-- silently start receiving a subscription. Admin approval of a COMPLETED
-- pending shop still grants it, as before.
CREATE OR REPLACE FUNCTION public.grant_beta_on_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  beta_plan_id UUID;
BEGIN
  IF NEW.status = 'verified'
     AND (OLD.status IS DISTINCT FROM 'verified')
     AND OLD.registration_completed_at IS NOT NULL THEN
    SELECT id INTO beta_plan_id
    FROM public.subscription_plans
    WHERE name = 'Beta Access'
    LIMIT 1;

    IF beta_plan_id IS NOT NULL THEN
      INSERT INTO public.business_subscriptions (
        business_id,
        plan_id,
        current_period_start,
        current_period_end,
        status
      ) VALUES (
        NEW.id,
        beta_plan_id,
        NOW(),
        NOW() + INTERVAL '3 months',
        'active'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
