-- business_notifications — per-user inbox rows behind the mobile tab badge.
--
-- The mobile Updates feed derives "what's new" by scanning the source tables
-- at read time; this table materializes the same events per follower at write
-- time, so a client can (a) read an unread count cheaply and (b) subscribe to
-- its own INSERTs over Supabase Realtime for a live badge.
--
-- Deliberately a SEPARATE table from `notifications` (20260609000000), which is
-- the web/admin business-document + coupon-redemption inbox keyed on a
-- different schema (read_at / metadata / business_document_* types). This is
-- the follower-facing feed (post / promo / product), keyed on is_read / data.
-- Keeping them apart means neither surface's writes or schema changes can break
-- the other.
--
-- Consumed by the mobile-only routes under /api/protected/mobile/notifications.

CREATE TABLE public.business_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('post', 'promo', 'product')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- List query is "mine, newest first"; badge query is "mine, unread count".
CREATE INDEX idx_business_notifications_user_created
  ON public.business_notifications (user_id, created_at DESC);
CREATE INDEX idx_business_notifications_user_unread
  ON public.business_notifications (user_id) WHERE is_read = FALSE;

-- RLS: users see and update (mark read) only their own rows. There are no
-- user INSERT/DELETE policies — rows are produced solely by the SECURITY
-- DEFINER fan-out below.
ALTER TABLE public.business_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own business notifications"
ON public.business_notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users update own business notifications"
ON public.business_notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins manage all business notifications"
ON public.business_notifications FOR ALL
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Fan-out: one notification per follower of the business. SECURITY DEFINER
-- because the inserting role (a business owner in the dashboard) has no
-- INSERT right on business_notifications. The verified/non-archived gate
-- mirrors the visibility rule RLS applies to every mobile feed source. Runs
-- inside the source row's INSERT transaction — one INSERT…SELECT per event; if
-- follower counts grow large enough to slow dashboard writes, move this to an
-- async outbox (see tech-debt).
CREATE OR REPLACE FUNCTION public.notify_followers(
  p_business_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB
) RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.business_notifications (user_id, type, title, body, data)
  SELECT f.user_id, p_type, p_title, p_body, p_data
  FROM public.follows f
  JOIN public.businesses b ON b.id = f.business_id
  WHERE f.business_id = p_business_id
    AND f.user_id IS NOT NULL
    AND b.status = 'verified'
    AND b.archived_at IS NULL;
$$;

-- Trigger-only helper: never a client RPC. Postgres grants EXECUTE to PUBLIC by
-- default and Supabase exposes public-schema functions as PostgREST endpoints,
-- so without this REVOKE any anon/authenticated caller could invoke this
-- SECURITY DEFINER fan-out directly and inject attacker-controlled
-- notifications into every follower's inbox. The trigger functions below call
-- it as their own definer regardless of this grant. Supabase grants EXECUTE to
-- anon/authenticated directly (via ALTER DEFAULT PRIVILEGES), so revoking from
-- PUBLIC alone is not enough — those roles must be named explicitly.
REVOKE EXECUTE ON FUNCTION public.notify_followers(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- New product (available, not archived) — published_at in the Updates feed is
-- the product's created_at, so INSERT is the publish moment.
CREATE OR REPLACE FUNCTION public.handle_product_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_followers(
    NEW.business_id, 'product', NEW.name, NEW.description,
    jsonb_build_object('business_id', NEW.business_id, 'product_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_insert_notify
AFTER INSERT ON public.products
FOR EACH ROW
WHEN (NEW.is_available AND NEW.archived_at IS NULL)
EXECUTE FUNCTION public.handle_product_notification();

-- New post — the dashboard inserts posts already published (published_at
-- defaults to NOW()).
CREATE OR REPLACE FUNCTION public.handle_post_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_followers(
    NEW.business_id, 'post', NEW.title, NEW.body,
    jsonb_build_object('business_id', NEW.business_id, 'post_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_insert_notify
AFTER INSERT ON public.business_posts
FOR EACH ROW
WHEN (NEW.archived_at IS NULL)
EXECUTE FUNCTION public.handle_post_notification();

-- Newly-live promo — mirrors the Updates feed window (published + started +
-- not expired). Fires on INSERT when the coupon is born live, and on the
-- status flip to 'published' for draft→publish flows. A coupon published with
-- a future start_date never notifies (same gap as the feed: it would need a
-- scheduled job, not a trigger — documented in tech-debt).
CREATE OR REPLACE FUNCTION public.handle_coupon_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_followers(
    NEW.business_id, 'promo', NEW.code, NEW.description,
    jsonb_build_object('business_id', NEW.business_id, 'coupon_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_coupon_insert_notify
AFTER INSERT ON public.coupons
FOR EACH ROW
WHEN (
  NEW.status = 'published'
  AND NEW.archived_at IS NULL
  AND NEW.start_date <= NOW()
  AND NEW.expiry_date >= NOW()
)
EXECUTE FUNCTION public.handle_coupon_notification();

CREATE TRIGGER on_coupon_publish_notify
AFTER UPDATE OF status ON public.coupons
FOR EACH ROW
WHEN (
  NEW.status = 'published'
  AND OLD.status IS DISTINCT FROM 'published'
  AND NEW.archived_at IS NULL
  AND NEW.start_date <= NOW()
  AND NEW.expiry_date >= NOW()
)
EXECUTE FUNCTION public.handle_coupon_notification();

-- Live badge: let clients subscribe to INSERTs on their own rows.
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_notifications;
