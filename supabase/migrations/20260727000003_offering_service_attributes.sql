-- ============================================================
-- Offerings model — phase 3b: service + rental attributes
-- (.claude/OFFERINGS_MODEL.md — OF6, OF7)
-- ------------------------------------------------------------
-- Phase 1 said WHAT an offering is (`kind`). This says HOW it transacts and
-- what a customer needs to know before committing.
--
-- `booking_mode` is the second axis, kept separate from `kind` on purpose
-- (decision D3): a haircut and a van hire are both `kind='service'`, but their
-- availability math is completely different —
--
--   timeslot   : 30 minutes against a provider   (salon, clinic)
--   date_range : whole days against unit stock   (van rental, room)
--   request    : customer proposes, owner confirms (catering, events)
--   inquiry    : call/message, no structured slot  (repairs, quotes)
--   none       : walk in, or just buy it          (retail, menu items)
--
-- Nothing here schedules anything yet — phase 4 adds `booking_requests`. These
-- columns are what the listing DISPLAYS and what that phase will read.
--
-- All columns are nullable/defaulted: every existing row and every existing
-- query is unaffected. No RLS change (the owner/admin/public policies on
-- `products` are column-agnostic).
--
-- Rollback: DROP the nine columns + the CHECK. No data loss.
-- ============================================================

ALTER TABLE public.products
  -- How this offering transacts. 'none' = today's behavior for every row.
  ADD COLUMN booking_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (booking_mode IN ('none', 'inquiry', 'request', 'timeslot', 'date_range')),

  -- Appointment length (salon, lesson, tour). NULL for anything unscheduled.
  ADD COLUMN duration_minutes INTEGER
    CHECK (duration_minutes IS NULL OR duration_minutes > 0),

  -- Minimum notice before a booking can start ("book at least 2h ahead").
  ADD COLUMN lead_time_minutes INTEGER
    CHECK (lead_time_minutes IS NULL OR lead_time_minutes >= 0),

  -- How many can be booked CONCURRENTLY — 3 vans, 2 treatment rooms. This is
  -- the number phase 4's overlap check counts against. NULL = unconstrained.
  ADD COLUMN inventory_count INTEGER
    CHECK (inventory_count IS NULL OR inventory_count >= 0),

  -- How many people one unit holds — 12-seater van, 8-person tour. A display
  -- and filter facet, NOT a concurrency limit (that is inventory_count).
  ADD COLUMN capacity INTEGER
    CHECK (capacity IS NULL OR capacity > 0),

  -- Shown to the customer up front. NOT collected in-app — payments are out
  -- of scope for this model.
  ADD COLUMN deposit_amount NUMERIC
    CHECK (deposit_amount IS NULL OR deposit_amount >= 0),

  -- Booking length bounds, counted in the unit implied by price_type
  -- (per_day ⇒ days, per_hour ⇒ hours). "3-day minimum hire."
  ADD COLUMN min_duration_units INTEGER
    CHECK (min_duration_units IS NULL OR min_duration_units > 0),
  ADD COLUMN max_duration_units INTEGER
    CHECK (max_duration_units IS NULL OR max_duration_units > 0),

  -- Where it happens. 'at_customer' is the mobile plumber / delivery-only case
  -- that branch-based discovery alone cannot express.
  ADD COLUMN service_location TEXT NOT NULL DEFAULT 'at_business'
    CHECK (service_location IN ('at_business', 'at_customer', 'both'));

-- A sane range or none at all — a max below the min is unsatisfiable, and the
-- form would otherwise happily save it.
ALTER TABLE public.products
  ADD CONSTRAINT products_duration_units_ordered
    CHECK (
      min_duration_units IS NULL
      OR max_duration_units IS NULL
      OR min_duration_units <= max_duration_units
    );

-- OF7 — quote-based pricing. Enforced at the DB so a direct PostgREST write
-- can't create a priceless offering that renders as a blank where a number
-- should be. (`price_type` gained 'on_request' in 20260727000002.)
--
-- `products.price` has been nullable since 20260217034520, so any environment
-- MAY hold a NULL-price row even though local has none — and ADD CONSTRAINT
-- validates immediately, which would abort the whole migration on apply.
-- Reclassify those rows first: a priceless offering is, by definition, one
-- priced on request.
UPDATE public.products
   SET price_type = 'on_request'
 WHERE price IS NULL
   AND price_type <> 'on_request';

ALTER TABLE public.products
  ADD CONSTRAINT products_price_required_unless_on_request
    CHECK (price_type = 'on_request' OR price IS NOT NULL);

COMMENT ON COLUMN public.products.booking_mode IS
  'How this offering transacts: none|inquiry|request|timeslot|date_range. '
  'Separate axis from `kind` — see .claude/OFFERINGS_MODEL.md D3.';
COMMENT ON COLUMN public.products.inventory_count IS
  'Concurrently bookable units (3 vans). Phase 4 counts overlaps against this. '
  'NULL = unconstrained. Not the same as `capacity` (seats per unit).';
COMMENT ON COLUMN public.products.deposit_amount IS
  'Displayed to the customer only — deposits are not collected in-app.';

-- Bookable offerings are the hot filter for phase 4 and for a "bookable only"
-- discovery facet; partial so it stays tiny while most rows are 'none'.
CREATE INDEX IF NOT EXISTS idx_products_bookable
  ON public.products (business_id, booking_mode, status)
  WHERE booking_mode <> 'none';

-- ------------------------------------------------------------
-- Extend the phase-2 offering_profile with the field policy the add/edit form
-- reads. Still presentation only (D4): it decides which TYPED columns render,
-- never what exists or what validates.
--
--   fields               — which service attributes to show
--   allowed_price_types  — which price types the picker offers
--   default_booking_mode — preselected for a new offering
--
-- A NULL/absent key means "no opinion", and the form falls back to today's
-- retail behavior (no service fields, all price types, booking_mode 'none').
-- ------------------------------------------------------------
UPDATE public.business_types SET offering_profile = offering_profile || jsonb_build_object(
  'fields', jsonb_build_array(),
  'allowed_price_types', jsonb_build_array('fixed', 'from', 'per_person', 'on_request'),
  'default_booking_mode', 'none'
) WHERE name = 'Food & Beverage';

UPDATE public.business_types SET offering_profile = offering_profile || jsonb_build_object(
  'fields', jsonb_build_array(),
  'allowed_price_types', jsonb_build_array('fixed', 'from', 'on_request'),
  'default_booking_mode', 'none'
) WHERE name = 'Retail';

UPDATE public.business_types SET offering_profile = offering_profile || jsonb_build_object(
  'fields', jsonb_build_array('duration_minutes', 'lead_time_minutes', 'service_location'),
  'allowed_price_types', jsonb_build_array(
    'fixed', 'from', 'per_hour', 'per_person', 'on_request'),
  'default_booking_mode', 'request'
) WHERE name = 'Services';

UPDATE public.business_types SET offering_profile = offering_profile || jsonb_build_object(
  'fields', jsonb_build_array(
    'duration_minutes', 'capacity', 'inventory_count', 'deposit_amount',
    'min_duration_units', 'max_duration_units'),
  'allowed_price_types', jsonb_build_array(
    'fixed', 'from', 'per_day', 'per_person', 'per_event', 'on_request'),
  'default_booking_mode', 'request'
) WHERE name = 'Tourism & Leisure';
