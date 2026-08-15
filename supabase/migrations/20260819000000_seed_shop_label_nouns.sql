-- ============================================================
-- business_types.offering_profile: seed shopLabel nouns
-- ------------------------------------------------------------
-- The IA/nav pass (spec §6.7.1) made the owner sidebar's storefront
-- entry vocabulary-driven via `OfferingNouns.shopLabel` (default
-- "My Shop"). This seeds the per-vertical noun so the data exercises
-- the mechanism instead of every vertical silently reading the fallback.
--
-- Values: "My Shop" is the universal storefront name and stays explicit
-- everywhere it is correct. "My Fleet" lands on Tourism & Leisure — the
-- rentals/tours vertical (vans, boats, tour vehicles; its profile is the
-- one carrying the rental field set). There is no "Transport & Rental"
-- vertical in the catalog; Tourism & Leisure is its closest mapping, and
-- the noun is one admin edit away if a future vertical needs its own.
--
-- All three mode keys (products/services/both) are seeded with the same
-- vertical value so a business resolves the label whatever its
-- `offering_mode` — the resolver (resolveOfferingVocabulary) reads
-- profile[modeKey].shopLabel with a per-field fallback to "My Shop".
--
-- Purely additive JSONB (new keys on existing profiles); no column
-- changes, no RLS, no data loss. Idempotent: jsonb_set overwrites.
--
-- Rollback:
--   UPDATE public.business_types
--   SET offering_profile = offering_profile
--     #- '{products,shopLabel}' #- '{services,shopLabel}' #- '{both,shopLabel}';
-- ============================================================

-- Universal "My Shop" — the explicit default for six verticals.
UPDATE public.business_types
SET offering_profile = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(offering_profile, '{}'::jsonb),
      '{products,shopLabel}', '"My Shop"'::jsonb, true
    ),
    '{services,shopLabel}', '"My Shop"'::jsonb, true
  ),
  '{both,shopLabel}', '"My Shop"'::jsonb, true
)
WHERE name IN (
  'Retail',
  'Food & Beverage',
  'Services',
  'Health & Wellness',
  'Education & Learning',
  'Home & Property Services',
  'Entertainment & Events'
);

-- The rentals/tours vertical: the storefront IS the fleet.
UPDATE public.business_types
SET offering_profile = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(offering_profile, '{}'::jsonb),
      '{products,shopLabel}', '"My Fleet"'::jsonb, true
    ),
    '{services,shopLabel}', '"My Fleet"'::jsonb, true
  ),
  '{both,shopLabel}', '"My Fleet"'::jsonb, true
)
WHERE name = 'Tourism & Leisure';
