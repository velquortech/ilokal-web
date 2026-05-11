CREATE TYPE public.price_type AS ENUM (
  'fixed',       -- ₱280
  'from',        -- From ₱12,000  (base price, varies by scope)
  'per_hour',    -- ₱500/hr
  'per_day',     -- ₱8,000/day
  'per_person',  -- ₱350/person
  'per_event'    -- ₱25,000/event
);

ALTER TABLE public.products
  ADD COLUMN price_type public.price_type NOT NULL DEFAULT 'fixed',
  ADD COLUMN price_unit TEXT;  -- optional override label, e.g. "per table", "per pax"
