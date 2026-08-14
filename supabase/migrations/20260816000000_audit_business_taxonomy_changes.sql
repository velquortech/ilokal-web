-- ============================================================
-- SEC: audit business TAXONOMY changes (category / business type)
-- ============================================================
--
-- The profile form lets an owner re-classify their shop (change the
-- business type / category). That changes how customers find the shop and
-- which offering vocabulary it uses, so it must be visible to admins —
-- exactly what `audit_log` (20260526000011) is for: "sensitive operations,
-- only admins can read via the API."
--
-- 20260526000011's `audit_business_changes()` only recorded `status`
-- changes. This migration rewrites the function to also log:
--   • category_id changes, with the category NAME resolved for readability,
--   • business_type_id changes, with the type NAME resolved.
-- Each changed field gets its own audit_log row (status / category / type),
-- so the admin UI can render clean old → new diffs.
--
-- Trigger definition is unchanged (AFTER UPDATE ON public.businesses,
-- function guards per-field with IS DISTINCT FROM) and still fires on any
-- UPDATE — the profile action always writes the row, so a no-op category
-- write produces no row.
--
-- Rollback: restore the function body from 20260526000011.
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_business_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Verification status changes
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

  -- Business category changes (owner re-classification)
  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    INSERT INTO public.audit_log
      (action, table_name, record_id, old_value, new_value, performed_by)
    VALUES (
      'UPDATE',
      'businesses',
      NEW.id,
      jsonb_build_object(
        'category_id', OLD.category_id,
        'category_name', (SELECT name FROM public.business_categories WHERE id = OLD.category_id)
      ),
      jsonb_build_object(
        'category_id', NEW.category_id,
        'category_name', (SELECT name FROM public.business_categories WHERE id = NEW.category_id)
      ),
      auth.uid()
    );
  END IF;

  -- Business type changes — normally derived from the category by
  -- sync_business_type_id(), but a divergent write (or a category change
  -- that flips the type) still needs to be visible.
  IF OLD.business_type_id IS DISTINCT FROM NEW.business_type_id THEN
    INSERT INTO public.audit_log
      (action, table_name, record_id, old_value, new_value, performed_by)
    VALUES (
      'UPDATE',
      'businesses',
      NEW.id,
      jsonb_build_object(
        'business_type_id', OLD.business_type_id,
        'business_type_name', (SELECT name FROM public.business_types WHERE id = OLD.business_type_id)
      ),
      jsonb_build_object(
        'business_type_id', NEW.business_type_id,
        'business_type_name', (SELECT name FROM public.business_types WHERE id = NEW.business_type_id)
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- The trigger from 20260526000011 already calls this function on every
-- UPDATE; no DDL change needed. Revoke stays the same (triggers only).
REVOKE ALL ON FUNCTION public.audit_business_changes() FROM PUBLIC, anon, authenticated;
