-- ============================================================
-- owner_events: the owner-side product funnel
-- ------------------------------------------------------------
-- `view_events` tracks CUSTOMERS; `audit_log` tracks admin/trigger
-- mutations; Sentry is errors-only. Owner behavior — how far an owner gets
-- through registration, where they stall, which dashboard actions they
-- reach — has no home today. This table is that home.
--
--   • owner_id — the acting user (NOT NULL: an owner event without an owner
--     is noise, and the RLS INSERT policy requires it to match auth.uid()).
--   • business_id — NULLABLE on purpose: registration-funnel events fire
--     BEFORE the business row exists.
--   • event + payload — a small controlled vocabulary of strings
--     (reg_step_viewed, reg_step_completed, reg_step_error, reg_back_nav,
--     reg_submitted; later phases add coupon_*/checklist_*/chart_* events).
--     Payload is free-form JSONB (step number, field names, template ids…).
--
-- No client policies except owner-insert + owner-select; everything else
-- (admin analytics) reads through the admin role. Writes go through the
-- `logOwnerEvent` Server Action, which is fire-and-forget by contract —
-- monitoring must never delay or break the flow it describes.
--
-- Rollback:
--   DROP TABLE public.owner_events;
-- ============================================================

CREATE TABLE public.owner_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Analytics queries group by owner/time or business/time, and filter by event.
CREATE INDEX idx_owner_events_owner_time
  ON public.owner_events (owner_id, created_at DESC);
CREATE INDEX idx_owner_events_business_time
  ON public.owner_events (business_id, created_at DESC);
CREATE INDEX idx_owner_events_event
  ON public.owner_events (event);

ALTER TABLE public.owner_events ENABLE ROW LEVEL SECURITY;

-- Owners write their own funnel…
CREATE POLICY "Owners insert their own events"
  ON public.owner_events FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- …and read their own rows (future surfaces may show "your activity").
CREATE POLICY "Owners read their own events"
  ON public.owner_events FOR SELECT
  USING (auth.uid() = owner_id);

-- Admin analytics read everything (same role check as audit_log).
CREATE POLICY "Admins read all owner events"
  ON public.owner_events FOR SELECT
  USING (public.is_admin());
