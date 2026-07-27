-- ============================================================
-- Offerings model — phase 2: type-driven vocabulary
-- (.claude/OFFERINGS_MODEL.md — OF5, decision D4)
-- ------------------------------------------------------------
-- A salon owner opens the dashboard and reads "Product Catalogue" / "Add
-- Product". A van-rental partner reads the same. The words are hardcoded to
-- retail in ~8 surfaces.
--
-- `offering_profile` supplies them as DATA, keyed by the business's
-- `offering_mode` (added in 20260727000000) so a mixed business gets its own
-- wording rather than a concatenation guess:
--
--   {
--     "products": { "singular": "...", "plural": "...", "catalogue": "..." },
--     "services": { ... },
--     "both":     { ... },
--     "icon": "Coffee"
--   }
--
-- Adding a vertical ("Transport & Rental" → "Vehicle / Fleet / Our Fleet") is
-- then one row edit with no deploy.
--
-- HARD BOUNDARY (D4): this controls WORDS, and in phase 3 which typed fields
-- render. It does NOT control schema, validation, or query shape. Anything
-- missing or malformed falls back to today's retail copy in the resolver, so a
-- bad row can never blank the UI.
--
-- Rollback: DROP COLUMN. Every surface falls back to the hardcoded retail
-- vocabulary it used before phase 2.
-- ============================================================

ALTER TABLE public.business_types
  ADD COLUMN offering_profile JSONB;

COMMENT ON COLUMN public.business_types.offering_profile IS
  'Vocabulary template keyed by businesses.offering_mode '
  '(products|services|both), each { singular, plural, catalogue }, plus an '
  'optional lucide `icon`. NULL / malformed ⇒ the app falls back to retail '
  'copy. Presentation only — never schema or validation. '
  'See .claude/OFFERINGS_MODEL.md D4.';

-- ------------------------------------------------------------
-- Seed the four shipped verticals. Matched on name (admin-editable): a
-- renamed type simply keeps a NULL profile and renders retail copy.
-- ------------------------------------------------------------
UPDATE public.business_types SET offering_profile = jsonb_build_object(
  'products', jsonb_build_object(
    'singular', 'Menu Item', 'plural', 'Menu Items', 'catalogue', 'Menu'),
  'services', jsonb_build_object(
    'singular', 'Service', 'plural', 'Services', 'catalogue', 'Services'),
  'both', jsonb_build_object(
    'singular', 'Item', 'plural', 'Items', 'catalogue', 'Menu & Services'),
  'icon', 'Coffee'
) WHERE name = 'Food & Beverage';

UPDATE public.business_types SET offering_profile = jsonb_build_object(
  'products', jsonb_build_object(
    'singular', 'Product', 'plural', 'Products', 'catalogue', 'Product Catalogue'),
  'services', jsonb_build_object(
    'singular', 'Service', 'plural', 'Services', 'catalogue', 'Services'),
  'both', jsonb_build_object(
    'singular', 'Item', 'plural', 'Items', 'catalogue', 'Catalogue'),
  'icon', 'Store'
) WHERE name = 'Retail';

UPDATE public.business_types SET offering_profile = jsonb_build_object(
  'products', jsonb_build_object(
    'singular', 'Product', 'plural', 'Products', 'catalogue', 'Products'),
  'services', jsonb_build_object(
    'singular', 'Service', 'plural', 'Services', 'catalogue', 'Service Menu'),
  'both', jsonb_build_object(
    'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Products & Services'),
  'icon', 'Scissors'
) WHERE name = 'Services';

UPDATE public.business_types SET offering_profile = jsonb_build_object(
  'products', jsonb_build_object(
    'singular', 'Item', 'plural', 'Items', 'catalogue', 'Shop'),
  'services', jsonb_build_object(
    'singular', 'Package', 'plural', 'Packages', 'catalogue', 'Packages'),
  'both', jsonb_build_object(
    'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Offerings'),
  'icon', 'Plane'
) WHERE name = 'Tourism & Leisure';
