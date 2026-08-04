-- ============================================================
-- Events — featured events on /explore, /events, /events/[eventId]
-- (.claude/EVENTS.md — phase 1)
-- ------------------------------------------------------------
-- Two authors, one table. `business_id IS NULL` is a PLATFORM event authored by
-- an admin; a set `business_id` is a shop's own event, which must be reviewed
-- before it can appear anywhere public. A second `platform_events` table would
-- double every policy, index, query and component for one nullable column.
--
-- THE SECURITY STORY IS THE APPROVAL GATE. The owner policy is FOR ALL, so
-- without a trigger an owner could `PATCH status='approved'` straight through
-- PostgREST and publish their own banner to every visitor on the front page.
-- RLS cannot express "you may write this row but not that column", so the gate
-- is a pair of BEFORE triggers — the same shape as
-- `set_business_initial_status` (20260723000000) and the SEC-1 profiles trigger
-- (20260717000001).
--
-- Ships DARK behind `app_settings.enable_events` (default false), so this can
-- reach cloud without changing anything a user sees.
--
-- Rollback:
--   DROP TABLE public.events CASCADE;
--   DROP FUNCTION public.events_nearby(float, float, int);
--   DROP FUNCTION public.notify_event_proposal_submitted(uuid);
--   DROP FUNCTION public.set_event_initial_status();
--   DROP FUNCTION public.guard_event_review_columns();
--   ALTER TABLE public.products DROP CONSTRAINT uq_products_id_business;
--   DELETE FROM storage.buckets WHERE id = 'event-images';
--   DELETE FROM public.app_settings WHERE key = 'enable_events';
--   DROP FUNCTION public.public_feature_flags();
--   -- and restore notification_outbox_type_check to its pre-events value.
--   -- and restore notifications_type_check to its pre-events value.
-- ============================================================

-- 1. Feature flag ---------------------------------------------------------

INSERT INTO public.app_settings (key, value)
VALUES ('enable_events', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 1b. Public feature flags ------------------------------------------------
--
-- `app_settings` is readable `TO authenticated` only (20260723000000), which
-- is right for the registration gates — every reader of those is signed in.
-- It is WRONG for a flag that gates a PUBLIC surface: an anonymous visitor on
-- /explore or /events reads zero rows, the reader fails closed, and the whole
-- feature is invisible to exactly the audience it was built for.
--
-- Fixed via a function rather than a broad anon SELECT policy on the table:
-- the RETURNED COLUMN LIST is the contract, so it cannot over-expose, and a
-- settings row added later stays private by default. Same reasoning as
-- `get_business_public_info` (20260727000006) — and the opposite of the
-- `USING (true)` policy that leaked the whole follow graph in 20260607000000.
--
-- Deliberately NOT a grant on `get_app_setting_bool(key, default)`: that takes
-- the key from the caller, so granting it would let anyone read any settings
-- row by name. This reuses it internally, where the key is ours.
CREATE OR REPLACE FUNCTION public.public_feature_flags()
RETURNS TABLE (
  enable_events   BOOLEAN,
  enable_bookings BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.get_app_setting_bool('enable_events', false),
    public.get_app_setting_bool('enable_bookings', false);
$$;

REVOKE ALL ON FUNCTION public.public_feature_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_feature_flags() TO anon, authenticated;

-- 2. Make the cross-shop product hole unrepresentable ---------------------
--
-- An event may promote ONE offering. A `product_id` from the client is not
-- proof of ownership — a plain FK only says the row exists, which is exactly
-- the hole `sectionBelongsToBusiness()` had to close in application code for
-- product sections. Here it can be closed declaratively: a composite FK on
-- (product_id, business_id) makes "a product belonging to another shop"
-- impossible at the storage layer, with no application code involved.
--
-- The UNIQUE below is redundant (`id` is already the PK) and exists only to
-- give that composite FK a key to reference.

ALTER TABLE public.products
  ADD CONSTRAINT uq_products_id_business UNIQUE (id, business_id);

-- 3. Table ----------------------------------------------------------------

CREATE TABLE public.events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = platform event authored by an admin.
  business_id   UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  -- Optional: this event promotes one offering. Ownership enforced by the
  -- composite FK at the bottom of this block, not by application code.
  product_id    UUID,

  name          TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  description   TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  address       TEXT NOT NULL CHECK (char_length(btrim(address)) BETWEEN 1 AND 300),
  -- `address` is for humans. Distance needs coordinates: you cannot run
  -- ST_DWithin against a string, so "events near me" is unbuildable without
  -- this column.
  location      GEOGRAPHY(POINT, 4326),
  image_url     TEXT,

  -- Both carry date AND time.
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  CONSTRAINT events_dates_ordered CHECK (ends_at > starts_at),

  -- Optional daily window. NULL/NULL = the event runs continuously from
  -- starts_at to ends_at (a gig, an overnight sale). Set = it opens these
  -- hours on each day of the run, so a three-day fiesta is not claimed to be
  -- running at 3am on day two. daily_end_time < daily_start_time means it
  -- closes after midnight — the overnight case lib/utils/operatingHours.ts
  -- already solves for shop hours.
  daily_start_time TIME,
  daily_end_time   TIME,
  CONSTRAINT events_daily_window_paired
    CHECK ((daily_start_time IS NULL) = (daily_end_time IS NULL)),

  -- Two destinations: "the event's website" and "buy tickets" are not the same
  -- place and one column cannot be both. The scheme is constrained HERE as
  -- well as in Zod, because PostgREST bypasses Zod entirely and this repo has
  -- already shipped a `javascript:` URL that only stayed inert because nothing
  -- rendered it.
  link_url      TEXT CHECK (link_url   IS NULL OR link_url   ~* '^https?://'),
  ticket_url    TEXT CHECK (ticket_url IS NULL OR ticket_url ~* '^https?://'),

  status        TEXT NOT NULL DEFAULT 'pending_review'
                CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  -- A rejection the owner cannot read is not a review.
  review_note   TEXT CHECK (review_note IS NULL OR char_length(review_note) <= 1000),
  reviewed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,

  -- Banner order. Without it, "if there are many events" renders in whatever
  -- order Postgres happens to return.
  priority      SMALLINT NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at   TIMESTAMPTZ,

  -- A promoted offering needs a shop to belong to.
  CONSTRAINT events_product_needs_business
    CHECK (product_id IS NULL OR business_id IS NOT NULL),

  -- The cross-shop gate (see §2).
  --
  -- `SET NULL (product_id)` — the COLUMN LIST is load-bearing. A bare
  -- `ON DELETE SET NULL` nulls every referencing column, so deleting a
  -- promoted product would also null `business_id`: the row would become a
  -- PLATFORM event, which the public policy publishes with no verified-shop
  -- gate and which no owner policy can ever select, edit or archive again.
  -- Losing the promotion is correct; losing the shop is not.
  CONSTRAINT fk_events_product_same_business
    FOREIGN KEY (product_id, business_id)
    REFERENCES public.products (id, business_id)
    ON DELETE SET NULL (product_id)
);

-- The point, readable.
--
-- PostgREST returns a `geography` column as WKB hex, which is useless to a
-- form — the same wall the branch map hit, solved there with an RPC. Generated
-- columns are cheaper here: they keep `location` the single source of truth
-- (they cannot be written) while letting an edit form read back exactly what
-- was stored. Without them the form has no way to show existing coordinates,
-- and a save that omits them silently erases the point.
ALTER TABLE public.events
  ADD COLUMN latitude  DOUBLE PRECISION
    GENERATED ALWAYS AS (ST_Y(location::geometry)) STORED,
  ADD COLUMN longitude DOUBLE PRECISION
    GENERATED ALWAYS AS (ST_X(location::geometry)) STORED;

COMMENT ON TABLE public.events IS
  'Featured events. business_id NULL = platform event authored by an admin; '
  'set = a shop event that must be approved before it is publicly visible. '
  'status is decided by trigger, never by the client.';

COMMENT ON COLUMN public.events.daily_start_time IS
  'With daily_end_time: the event opens these hours on each day between '
  'starts_at and ends_at. Both NULL = runs continuously.';

-- 4. Indexes --------------------------------------------------------------
-- Postgres does not auto-index FKs, and each of these backs a query this
-- feature actually runs.

-- The banner: approved, live, best first.
CREATE INDEX idx_events_live_banner
  ON public.events (starts_at, priority DESC)
  WHERE status = 'approved' AND archived_at IS NULL;

-- The admin queue.
CREATE INDEX idx_events_review_queue
  ON public.events (created_at DESC)
  WHERE status = 'pending_review' AND archived_at IS NULL;

-- The owner's own list, and the FK's referential-integrity check.
CREATE INDEX idx_events_business ON public.events (business_id, starts_at DESC);
CREATE INDEX idx_events_product  ON public.events (product_id);

-- Distance search (events_nearby).
CREATE INDEX idx_events_location ON public.events USING GIST (location);

-- 5. RLS ------------------------------------------------------------------
-- Every auth function is wrapped as `(select auth.uid())` per the initPlan
-- standard (20260717000002) — a bare call re-evaluates once per row scanned.

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Public read: approved, non-archived. A platform event (business_id NULL) is
-- always visible once approved; a shop event additionally requires the shop to
-- be verified and live — the same gate as business_posts, NOT a blanket
-- USING (true), which is what leaked the whole follow graph in 20260607000000.
--
-- Deliberately NOT filtered by date: the banner filters on dates, but the
-- detail page must keep resolving after the event ends or every link shared to
-- Facebook 404s the next morning.
CREATE POLICY "Public view approved events"
ON public.events FOR SELECT
USING (
  status = 'approved'
  AND archived_at IS NULL
  AND (
    business_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = events.business_id
        AND b.status = 'verified'
        AND b.archived_at IS NULL
    )
  )
);

-- The owner sees their own events in ANY status, so a proposal is visible
-- while it waits and a rejection is readable.
CREATE POLICY "Owners view own events"
ON public.events FOR SELECT
USING (
  business_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = events.business_id
      AND b.owner_id = (select auth.uid())
  )
);

-- The owner writes their own events. WITH CHECK is written out rather than
-- left to default to USING: a FOR ALL policy silently reuses its USING clause
-- for writes, and PR #18 found that pattern letting rows be rewritten in ways
-- the author never intended. `status` is still not the owner's to choose —
-- that is the trigger's job, below.
CREATE POLICY "Owners manage own events"
ON public.events FOR ALL
USING (
  business_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = events.business_id
      AND b.owner_id = (select auth.uid())
  )
)
WITH CHECK (
  business_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = events.business_id
      AND b.owner_id = (select auth.uid())
  )
);

CREATE POLICY "Admins manage all events"
ON public.events FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. The approval gate ----------------------------------------------------
--
-- This is the part that matters. Everything else is presentation.

CREATE OR REPLACE FUNCTION public.set_event_initial_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- auth.uid() IS NULL means the service role or a seed: RLS was bypassed
  -- entirely, so there is no untrusted client here. anon cannot reach this
  -- trigger at all — it has no INSERT policy.
  IF (select auth.uid()) IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- A non-admin never chooses their own status. `draft` is theirs to keep
  -- (an unfinished event nobody has asked us to review); anything else means
  -- "submitted", and submitted means pending.
  NEW.status := CASE WHEN NEW.status = 'draft' THEN 'draft' ELSE 'pending_review' END;
  NEW.review_note := NULL;
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  -- Banner placement is the platform's call, not the applicant's.
  NEW.priority := 0;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_event_initial_status()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_event_review_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_content_changed boolean;
BEGIN
  IF (select auth.uid()) IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Review columns are the reviewer's record. A non-admin cannot move them,
  -- in either direction — silently reverted rather than raised, matching the
  -- SEC-1 profiles trigger, so an ordinary edit that happens to round-trip
  -- these fields still succeeds.
  NEW.review_note := OLD.review_note;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.priority    := OLD.priority;

  -- An event does not change shops. The FOR ALL policy's WITH CHECK only
  -- proves the owner owns the TARGET, so without this an owner of two shops
  -- could re-point an approved event from Shop A to Shop B and it would stay
  -- published under a shop no reviewer ever saw.
  NEW.business_id := OLD.business_id;

  v_content_changed :=
       NEW.name             IS DISTINCT FROM OLD.name
    OR NEW.description      IS DISTINCT FROM OLD.description
    OR NEW.address          IS DISTINCT FROM OLD.address
    OR NEW.location         IS DISTINCT FROM OLD.location
    OR NEW.image_url        IS DISTINCT FROM OLD.image_url
    OR NEW.starts_at        IS DISTINCT FROM OLD.starts_at
    OR NEW.ends_at          IS DISTINCT FROM OLD.ends_at
    OR NEW.daily_start_time IS DISTINCT FROM OLD.daily_start_time
    OR NEW.daily_end_time   IS DISTINCT FROM OLD.daily_end_time
    OR NEW.link_url         IS DISTINCT FROM OLD.link_url
    OR NEW.ticket_url       IS DISTINCT FROM OLD.ticket_url
    OR NEW.product_id       IS DISTINCT FROM OLD.product_id;

  IF OLD.status = 'approved' THEN
    -- Without this, an owner gets "Free coffee at the plaza" approved and then
    -- edits it into something else, on the front page, with no second look.
    -- Archiving is not a content change, so pulling your own event still works.
    IF v_content_changed THEN
      NEW.status := 'pending_review';
    ELSE
      NEW.status := OLD.status;
    END IF;
  ELSE
    -- draft -> pending_review (submit) and pending_review -> draft (withdraw)
    -- are the owner's to make. Approving or rejecting is not.
    NEW.status := CASE
      WHEN NEW.status IN ('draft', 'pending_review') THEN NEW.status
      ELSE OLD.status
    END;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_event_review_columns()
  FROM PUBLIC, anon, authenticated;

-- ENABLE ALWAYS on both.
--
-- NOT for the trg_set_redemption_code reason: under replica-mode seeding
-- auth.uid() is NULL, so both of these return NEW untouched and a seed would
-- be unaffected either way. What it actually buys is that the guard still runs
-- for writes that bypass ordinary trigger firing — including the referential
-- action from the composite FK below — which is where an unreviewed change to
-- a published row would otherwise slip through.
CREATE TRIGGER trg_set_event_initial_status
  BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_event_initial_status();
ALTER TABLE public.events ENABLE ALWAYS TRIGGER trg_set_event_initial_status;

CREATE TRIGGER trg_guard_event_review_columns
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_review_columns();
ALTER TABLE public.events ENABLE ALWAYS TRIGGER trg_guard_event_review_columns;

CREATE TRIGGER on_update_events
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Notifications --------------------------------------------------------
--
-- No new table: `notifications` already takes any auth.users id as recipient,
-- and an admin is a user. Four new types.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'business_document_approved',
    'business_document_rejected',
    'business_verified',
    'business_rejected',
    'system',
    'coupon_redeemed',
    'booking_requested',
    'booking_confirmed',
    'booking_declined',
    'booking_cancelled',
    'event_proposal_submitted',
    'event_proposal_approved',
    'event_proposal_rejected',
    'event_nearby'
  ));

-- Owner submits a proposal -> every admin is notified.
--
-- `create_notification` authorizes the caller as admin OR the recipient, and
-- here the caller is neither: an owner writing to admins. That is the same
-- situation that produced notify_coupon_redemption (customer caller, owner
-- recipient), so this is built to that template.
--
-- The admin-decides-owner direction needs NO new function — the caller is an
-- admin there, so create_notification already authorizes it.
CREATE OR REPLACE FUNCTION public.notify_event_proposal_submitted(p_event_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_business_id uuid;
  v_owner_id    uuid;
  v_status      text;
  v_name        text;
  v_shop        text;
  v_count       integer := 0;
BEGIN
  SELECT e.business_id, e.status, e.name
    INTO v_business_id, v_status, v_name
  FROM public.events e
  WHERE e.id = p_event_id;

  IF NOT FOUND OR v_business_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT b.owner_id, b.shop_name INTO v_owner_id, v_shop
  FROM public.businesses b WHERE b.id = v_business_id;

  -- Only the shop's owner may announce their own proposal.
  IF v_owner_id IS DISTINCT FROM (select auth.uid()) THEN
    RAISE EXCEPTION 'not authorized to notify for this event';
  END IF;

  -- Only a genuinely submitted event pings the queue. Without this the RPC is
  -- a free "notify every admin" button that a draft, or a resubmit loop, could
  -- hold down.
  IF v_status <> 'pending_review' THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, business_id, actor_id, metadata)
  SELECT
    p.id,
    'event_proposal_submitted',
    'New event proposal',
    COALESCE(v_shop, 'A business') || ' submitted "' || v_name || '" for review.',
    v_business_id,
    (select auth.uid()),
    jsonb_build_object('event_id', p_event_id, 'event_name', v_name)
  FROM public.profiles p
  WHERE p.role = 'admin' AND p.archived_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_event_proposal_submitted(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_event_proposal_submitted(uuid) TO authenticated;

-- The mobile inbox takes a fourth kind — in BOTH tables it can land in.
--
-- `notify_followers` fans out inline for small audiences and routes anything
-- over ~500 followers through `notification_outbox`, which carries its own
-- copy of this CHECK (20260630000001). Widening only one of them leaves the
-- fan-out violating a constraint for exactly the shops with the most
-- followers — and the EXCEPTION handler below would swallow it, so the
-- feature would silently never notify them.
ALTER TABLE public.business_notifications
  DROP CONSTRAINT IF EXISTS business_notifications_type_check;
ALTER TABLE public.business_notifications
  ADD CONSTRAINT business_notifications_type_check
  CHECK (type IN ('post', 'promo', 'product', 'event'));

ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_type_check
  CHECK (type IN ('post', 'promo', 'product', 'event'));

-- Followers hear about a shop's event the moment it is published.
--
-- Via a TRIGGER rather than the decision action, because `notify_followers` is
-- deliberately revoked from anon/authenticated (20260611000000): it is a
-- SECURITY DEFINER fan-out, and any caller who could invoke it directly could
-- inject notifications into every follower's inbox. Trigger functions call it
-- as their own definer, which is the only sanctioned path.
--
-- Fires only on the draft/pending → approved transition, so re-saving an
-- already-published event does not re-notify. A platform event has no
-- followers, hence the business_id guard.
CREATE OR REPLACE FUNCTION public.handle_event_published_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.business_id IS NOT NULL
     AND NEW.status = 'approved'
     AND OLD.status IS DISTINCT FROM 'approved'
     AND NEW.archived_at IS NULL
  THEN
    BEGIN
      PERFORM public.notify_followers(
        NEW.business_id,
        'event',
        NEW.name,
        NEW.description,
        jsonb_build_object('business_id', NEW.business_id, 'event_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN
      -- A fan-out failure must never roll back the approval it describes.
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_event_published_notification()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_event_published_notification
  AFTER UPDATE OF status ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_published_notification();

-- 8. Nearby ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.events_nearby(
  lat FLOAT,
  lng FLOAT,
  radius_meters INT DEFAULT 20000
)
RETURNS TABLE (
  id               UUID,
  name             TEXT,
  description      TEXT,
  address          TEXT,
  image_url        TEXT,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  daily_start_time TIME,
  daily_end_time   TIME,
  distance_meters  FLOAT,
  business_id      UUID,
  business_name    TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.id, e.name, e.description, e.address, e.image_url,
    e.starts_at, e.ends_at, e.daily_start_time, e.daily_end_time,
    ST_Distance(e.location, ST_MakePoint(lng, lat)::geography) AS distance_meters,
    e.business_id,
    b.shop_name AS business_name
  FROM public.events e
  LEFT JOIN public.businesses b ON b.id = e.business_id
  WHERE
    e.status = 'approved'
    AND e.archived_at IS NULL
    AND e.ends_at >= NOW()
    AND e.location IS NOT NULL
    AND ST_DWithin(e.location, ST_MakePoint(lng, lat)::geography, radius_meters)
    -- Mirrors the public SELECT policy: a platform event is always visible,
    -- a shop event only while its shop is verified and live. SECURITY DEFINER
    -- bypasses RLS, so this restates the gate rather than inheriting it.
    AND (
      e.business_id IS NULL
      OR (b.status = 'verified' AND b.archived_at IS NULL)
    )
  ORDER BY distance_meters ASC, e.starts_at ASC, e.id ASC;
$$;

REVOKE ALL ON FUNCTION public.events_nearby(FLOAT, FLOAT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.events_nearby(FLOAT, FLOAT, INT) TO anon, authenticated;

-- 9. Storage --------------------------------------------------------------
-- Path convention: <business_uuid>/<file> for shop events, platform/<file> for
-- admin-authored ones. Write policies are ownership-scoped from the start
-- (SEC-07, 20260526000006) rather than the blanket "any authenticated user"
-- shape the older buckets had to be retrofitted away from.

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Event images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

CREATE POLICY "Event images: owner or admin upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id::text = (storage.foldername(name))[1]
          AND owner_id = (select auth.uid())
          AND archived_at IS NULL
      )
    )
  );

CREATE POLICY "Event images: owner or admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id::text = (storage.foldername(name))[1]
          AND owner_id = (select auth.uid())
          AND archived_at IS NULL
      )
    )
  )
  WITH CHECK (
    bucket_id = 'event-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id::text = (storage.foldername(name))[1]
          AND owner_id = (select auth.uid())
          AND archived_at IS NULL
      )
    )
  );

CREATE POLICY "Event images: owner or admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id::text = (storage.foldername(name))[1]
          AND owner_id = (select auth.uid())
          AND archived_at IS NULL
      )
    )
  );
