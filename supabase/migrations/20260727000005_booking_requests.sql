-- ============================================================
-- Offerings model — phase 4: booking requests
-- (.claude/OFFERINGS_MODEL.md — OF8)
-- ------------------------------------------------------------
-- Deliberately REQUEST-based, not slot-based: the customer proposes a time (or
-- a date range for rentals), the owner confirms or declines. No calendar UI,
-- no staff scheduling, no recurring-availability engine. That is ~80% of the
-- value for ~10% of the work, and it is what makes a coupon-less services
-- business viable on the platform at all (their dashboard is otherwise all
-- zeros — see the plan doc §5).
--
-- SHIPS DARK: gated by the `enable_bookings` app_settings flag (default
-- false), so this can land on cloud without changing any user-visible
-- behavior until the flag is flipped.
--
-- Rollback: DROP the table + the three RPCs + the flag row, and revert the
-- notifications type CHECK. No existing data is touched.
-- ============================================================

-- ------------------------------------------------------------
-- Feature flag (existing app_settings pattern from 20260723000000)
-- ------------------------------------------------------------
INSERT INTO public.app_settings (key, value)
VALUES ('enable_bookings', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.products(id)   ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  branch_id    UUID          REFERENCES public.branches(id)   ON DELETE SET NULL,

  -- Point-in-time bookings (a haircut) leave ends_at NULL and rely on the
  -- product's duration_minutes. Rentals set both.
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ,
  party_size   INTEGER CHECK (party_size IS NULL OR party_size > 0),

  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','declined','cancelled','completed','no_show')),

  notes          TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  -- The owner's answer to an `on_request` offering. Display only — no payment
  -- is collected in-app.
  quoted_amount  NUMERIC CHECK (quoted_amount IS NULL OR quoted_amount >= 0),
  decision_note  TEXT CHECK (decision_note IS NULL OR char_length(decision_note) <= 2000),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at   TIMESTAMPTZ,

  CONSTRAINT booking_requests_range_ordered
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

COMMENT ON TABLE public.booking_requests IS
  'Request-based bookings: customer proposes, owner confirms/declines. Not a '
  'scheduling engine — see .claude/OFFERINGS_MODEL.md phase 4.';
COMMENT ON COLUMN public.booking_requests.quoted_amount IS
  'Owner''s quote for an on_request offering. Displayed only; never charged.';

-- Postgres does not auto-index FKs. Owner inbox, customer list, and the
-- overlap scan are the three hot reads.
CREATE INDEX IF NOT EXISTS idx_booking_requests_business
  ON public.booking_requests (business_id, status, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_requests_user
  ON public.booking_requests (user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_requests_product_window
  ON public.booking_requests (product_id, starts_at)
  WHERE status IN ('pending','confirmed');
CREATE INDEX IF NOT EXISTS idx_booking_requests_branch
  ON public.booking_requests (branch_id);

DROP TRIGGER IF EXISTS trg_booking_requests_updated_at ON public.booking_requests;
CREATE TRIGGER trg_booking_requests_updated_at
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------
-- RLS — every auth call wrapped in (select …) per the perf standard.
-- Writes go through the RPCs below; these policies are the floor.
-- ------------------------------------------------------------
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bookings"
  ON public.booking_requests FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Owners read bookings for their business"
  ON public.booking_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
     WHERE b.id = booking_requests.business_id
       AND b.owner_id = (select auth.uid())
  ));

-- Customers may only ever move their own booking to 'cancelled'; every other
-- transition is the owner's. Enforced here as well as in the RPC, because
-- PostgREST is reachable directly.
CREATE POLICY "Users cancel own bookings"
  ON public.booking_requests FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id AND status = 'cancelled');

CREATE POLICY "Owners update bookings for their business"
  ON public.booking_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
     WHERE b.id = booking_requests.business_id
       AND b.owner_id = (select auth.uid())
  ));

CREATE POLICY "Admins manage all bookings"
  ON public.booking_requests FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No INSERT policy on purpose: inserts must go through request_booking(),
-- which is where the availability check and the gate matrix live. A direct
-- PostgREST insert is denied.

-- ------------------------------------------------------------
-- Notification types
-- ------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'business_document_approved','business_document_rejected',
    'business_verified','business_rejected','system','coupon_redeemed',
    'booking_requested','booking_confirmed','booking_declined',
    'booking_cancelled'
  ]));

-- ------------------------------------------------------------
-- request_booking — the only insert path.
--
-- ATOMICITY: the availability check takes a transaction-scoped advisory lock
-- keyed on the product, so two concurrent requests for the last van cannot
-- both pass. This is deliberately NOT the count-then-insert pattern used by
-- the per-user coupon cap (a known TOCTOU, see CLAUDE.md) — overbooking a
-- physical asset is a real-world failure, not a counter drifting.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_booking(
  p_product_id UUID,
  p_starts_at  TIMESTAMPTZ,
  p_ends_at    TIMESTAMPTZ DEFAULT NULL,
  p_branch_id  UUID        DEFAULT NULL,
  p_party_size INTEGER     DEFAULT NULL,
  p_notes      TEXT        DEFAULT NULL
)
RETURNS public.booking_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user      UUID := auth.uid();
  v_product   RECORD;
  v_business  RECORD;
  v_taken     INTEGER;
  v_end       TIMESTAMPTZ;
  v_booking   public.booking_requests;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.get_app_setting_bool('enable_bookings', false) THEN
    RAISE EXCEPTION 'bookings are not enabled' USING ERRCODE = '22023';
  END IF;

  SELECT p.*, b.status AS business_status, b.archived_at AS business_archived_at
    INTO v_product
    FROM public.products p
    JOIN public.businesses b ON b.id = p.business_id
   WHERE p.id = p_product_id
     AND p.status = 'active'
     AND p.archived_at IS NULL
   FOR SHARE OF p;

  -- Same access invariant the coupon routes use: an unlisted/archived
  -- offering, or one belonging to an unverified/archived business, is a 404
  -- rather than a bookable thing.
  IF NOT FOUND
     OR v_product.business_status <> 'verified'
     OR v_product.business_archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'offering not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_product.booking_mode = 'none' THEN
    RAISE EXCEPTION 'this offering cannot be booked' USING ERRCODE = '22023';
  END IF;

  IF p_starts_at <= now() THEN
    RAISE EXCEPTION 'booking must start in the future' USING ERRCODE = '22023';
  END IF;

  IF v_product.lead_time_minutes IS NOT NULL
     AND p_starts_at < now() + make_interval(mins => v_product.lead_time_minutes) THEN
    RAISE EXCEPTION 'this offering needs more notice' USING ERRCODE = '22023';
  END IF;

  -- A point-in-time booking derives its end from the offering's duration, so
  -- the overlap maths below has a window either way.
  v_end := COALESCE(
    p_ends_at,
    CASE WHEN v_product.duration_minutes IS NOT NULL
         THEN p_starts_at + make_interval(mins => v_product.duration_minutes)
    END
  );

  IF v_end IS NOT NULL AND v_end <= p_starts_at THEN
    RAISE EXCEPTION 'booking must end after it starts' USING ERRCODE = '22023';
  END IF;

  IF p_party_size IS NOT NULL AND v_product.capacity IS NOT NULL
     AND p_party_size > v_product.capacity THEN
    RAISE EXCEPTION 'party size exceeds capacity' USING ERRCODE = '22023';
  END IF;

  -- The branch must belong to the offering's business (mirrors the redeem
  -- route's branch gate — a cross-business branch id is not a valid location).
  IF p_branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.branches
     WHERE id = p_branch_id AND business_id = v_product.business_id
  ) THEN
    RAISE EXCEPTION 'branch does not belong to this business' USING ERRCODE = '22023';
  END IF;

  IF v_product.branch_id IS NOT NULL
     AND p_branch_id IS DISTINCT FROM v_product.branch_id THEN
    RAISE EXCEPTION 'this offering is only available at its own branch'
      USING ERRCODE = '22023';
  END IF;

  -- ── Availability ────────────────────────────────────────────────────────
  -- Serialize concurrent requests for the SAME offering. Transaction-scoped,
  -- so it releases on commit/rollback without any explicit unlock.
  IF v_product.inventory_count IS NOT NULL AND v_end IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_product_id::text, 0));

    SELECT count(*) INTO v_taken
      FROM public.booking_requests br
     WHERE br.product_id = p_product_id
       AND br.status IN ('pending','confirmed')
       AND tstzrange(br.starts_at, COALESCE(br.ends_at, br.starts_at), '[)')
           && tstzrange(p_starts_at, v_end, '[)');

    IF v_taken >= v_product.inventory_count THEN
      RAISE EXCEPTION 'no availability for those dates' USING ERRCODE = '23505';
    END IF;
  END IF;

  INSERT INTO public.booking_requests (
    business_id, product_id, user_id, branch_id,
    starts_at, ends_at, party_size, notes
  ) VALUES (
    v_product.business_id, p_product_id, v_user, p_branch_id,
    p_starts_at, v_end, p_party_size, nullif(btrim(p_notes), '')
  )
  RETURNING * INTO v_booking;

  -- Notify the owner. Non-fatal: a notification failure must never roll back
  -- a booking (same contract as notify_coupon_redemption).
  BEGIN
    SELECT * INTO v_business FROM public.businesses WHERE id = v_product.business_id;
    INSERT INTO public.notifications (user_id, type, title, body, business_id, actor_id, metadata)
    VALUES (
      v_business.owner_id,
      'booking_requested',
      'New booking request',
      format('%s requested %s', COALESCE(
        (SELECT full_name FROM public.profiles WHERE id = v_user), 'A customer'),
        v_product.name),
      v_product.business_id,
      v_user,
      jsonb_build_object(
        'booking_id', v_booking.id,
        'product_id', p_product_id,
        'product_name', v_product.name,
        'starts_at', p_starts_at
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_booking;
END;
$$;

-- ------------------------------------------------------------
-- decide_booking — owner/admin confirm or decline.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decide_booking(
  p_booking_id    UUID,
  p_status        TEXT,
  p_decision_note TEXT    DEFAULT NULL,
  p_quoted_amount NUMERIC DEFAULT NULL
)
RETURNS public.booking_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_booking public.booking_requests;
  v_name    TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('confirmed','declined','completed','no_show') THEN
    RAISE EXCEPTION 'invalid decision' USING ERRCODE = '22023';
  END IF;

  SELECT br.* INTO v_booking
    FROM public.booking_requests br
    JOIN public.businesses b ON b.id = br.business_id
   WHERE br.id = p_booking_id
     AND (b.owner_id = v_user OR public.is_admin())
   FOR UPDATE OF br;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002';
  END IF;

  -- A cancelled or already-decided booking is not re-decidable; confirming a
  -- booking the customer withdrew would be a real double-booking.
  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'this booking was cancelled by the customer' USING ERRCODE = '22023';
  END IF;

  IF p_status IN ('confirmed','declined') AND v_booking.status <> 'pending' THEN
    RAISE EXCEPTION 'this booking has already been decided' USING ERRCODE = '22023';
  END IF;

  IF p_status IN ('completed','no_show') AND v_booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'only a confirmed booking can be closed out' USING ERRCODE = '22023';
  END IF;

  UPDATE public.booking_requests
     SET status        = p_status,
         decision_note = COALESCE(nullif(btrim(p_decision_note), ''), decision_note),
         quoted_amount = COALESCE(p_quoted_amount, quoted_amount),
         decided_at    = now()
   WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  BEGIN
    IF p_status IN ('confirmed','declined') THEN
      SELECT name INTO v_name FROM public.products WHERE id = v_booking.product_id;
      INSERT INTO public.notifications (user_id, type, title, body, business_id, actor_id, metadata)
      VALUES (
        v_booking.user_id,
        'booking_' || p_status,
        CASE WHEN p_status = 'confirmed'
             THEN 'Booking confirmed' ELSE 'Booking declined' END,
        format('%s — %s', v_name, to_char(v_booking.starts_at, 'Mon DD, HH12:MI AM')),
        v_booking.business_id,
        v_user,
        jsonb_build_object(
          'booking_id', v_booking.id,
          'product_name', v_name,
          'decision_note', v_booking.decision_note,
          'quoted_amount', v_booking.quoted_amount
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_booking;
END;
$$;

-- ------------------------------------------------------------
-- cancel_booking — the customer's own withdrawal.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id UUID)
RETURNS public.booking_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_booking public.booking_requests;
  v_owner   UUID;
  v_name    TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking
    FROM public.booking_requests
   WHERE id = p_booking_id AND user_id = v_user
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.status NOT IN ('pending','confirmed') THEN
    RAISE EXCEPTION 'this booking can no longer be cancelled' USING ERRCODE = '22023';
  END IF;

  UPDATE public.booking_requests
     SET status = 'cancelled', decided_at = now()
   WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  BEGIN
    SELECT owner_id INTO v_owner FROM public.businesses WHERE id = v_booking.business_id;
    SELECT name INTO v_name FROM public.products WHERE id = v_booking.product_id;
    INSERT INTO public.notifications (user_id, type, title, body, business_id, actor_id, metadata)
    VALUES (
      v_owner, 'booking_cancelled', 'Booking cancelled',
      format('%s — %s', v_name, to_char(v_booking.starts_at, 'Mon DD, HH12:MI AM')),
      v_booking.business_id, v_user,
      jsonb_build_object('booking_id', v_booking.id, 'product_name', v_name)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, INTEGER, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_booking(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, INTEGER, TEXT)
  TO authenticated;

REVOKE ALL ON FUNCTION public.decide_booking(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_booking(UUID, TEXT, TEXT, NUMERIC) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_booking(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID) TO authenticated;
