-- SEC-16: Audit log table for sensitive operations.
-- Tracks: profile role/status changes, business verification changes,
-- new business subscriptions, and payment status changes.
-- Only admins can read via the API. All inserts happen via triggers — no direct writes.

CREATE TABLE public.audit_log (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  action       TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name   TEXT        NOT NULL,
  record_id    UUID,
  old_value    JSONB,
  new_value    JSONB,
  performed_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table_name  ON public.audit_log (table_name);
CREATE INDEX idx_audit_log_record_id   ON public.audit_log (record_id);
CREATE INDEX idx_audit_log_performed_at ON public.audit_log (performed_at DESC);
CREATE INDEX idx_audit_log_performed_by ON public.audit_log (performed_by);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the log
CREATE POLICY "Admins view audit log"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

-- No direct INSERT/UPDATE/DELETE via the API — triggers only

-- ============================================================
-- Trigger: profiles — track role and status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role
  OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log
      (action, table_name, record_id, old_value, new_value, performed_by)
    VALUES (
      'UPDATE',
      'profiles',
      NEW.id,
      jsonb_build_object('role', OLD.role, 'status', OLD.status),
      jsonb_build_object('role', NEW.role, 'status', NEW.status),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_profiles_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profile_changes();

-- ============================================================
-- Trigger: businesses — track verification status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_business_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log
      (action, table_name, record_id, old_value, new_value, performed_by)
    VALUES (
      'UPDATE',
      'businesses',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_businesses_status
  AFTER UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.audit_business_changes();

-- ============================================================
-- Trigger: business_subscriptions — track new subscriptions
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_subscription_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log
    (action, table_name, record_id, new_value, performed_by)
  VALUES (
    'INSERT',
    'business_subscriptions',
    NEW.id,
    jsonb_build_object(
      'business_id', NEW.business_id,
      'plan_id',     NEW.plan_id,
      'status',      NEW.status
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_business_subscriptions_created
  AFTER INSERT ON public.business_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_created();

-- ============================================================
-- Trigger: payments — track payment status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_payment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log
      (action, table_name, record_id, old_value, new_value, performed_by)
    VALUES (
      'UPDATE',
      'payments',
      NEW.id,
      jsonb_build_object('status', OLD.status, 'amount', OLD.amount),
      jsonb_build_object('status', NEW.status, 'amount', NEW.amount),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_payments_status
  AFTER UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_changes();
