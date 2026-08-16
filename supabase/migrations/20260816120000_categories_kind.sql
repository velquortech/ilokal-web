-- ============================================================
-- Offerings model — kind-scope the category picker
-- ------------------------------------------------------------
-- `categories.business_type_id` (20260727000000) already stops a salon
-- seeing "Pastries": the picker reads "this vertical OR global". But the
-- vertical is not the kind. A 'both' business (Entertainment & Events today;
-- Tourism & Leisure when its booking flow ships) lists products AND services
-- from the same form, so a service being added is still offered the product
-- categories of its vertical — the same mismatch class the vertical scoping
-- killed, one level down.
--
-- `categories.kind` is the second axis, mirroring `products.kind`:
--   'product'  → only offered for product-kind offerings
--   'service'  → only offered for service-kind offerings
--   NULL       → either (a genuinely two-kind category, or a catch-all)
--
-- The picker rule becomes "this vertical OR global, AND this kind OR
-- either-kind". NULL stays load-bearing in both directions, exactly like
-- `business_type_id` — an unmapped category degrades to visible rather than
-- vanishing.
--
-- This is ADDITIVE and DEFAULTED: every existing row keeps today's behavior
-- (kind NULL = either), and no existing query changes.
--
-- Rollback: DROP COLUMN public.categories.kind; (no data loss — nothing is
-- moved or destroyed, only annotated).
-- ============================================================

ALTER TABLE public.categories
  ADD COLUMN kind TEXT
    CHECK (kind IN ('product', 'service'));

COMMENT ON COLUMN public.categories.kind IS
  'Offering kind this category is offered for: product, service, or NULL '
  '(either). Mirrors products.kind so the picker can be scoped by what is '
  'being added, not just by vertical. NULL = either kind, the fail-open default.';

CREATE INDEX IF NOT EXISTS idx_categories_kind
  ON public.categories (kind);

-- ─────────────────────── backfill ───────────────────────────
-- Matched on SLUG, not on the admin-editable business-type name: these rows
-- are created by migrations (20260519000000 / 20260805120000 / 20260805130000
-- / 20260807000000 / 20260815000000), so they exist when this runs on both a
-- fresh and an existing database — no COALESCE mirror in the seed is needed,
-- unlike the business_type_id pins.
--
-- Unambiguous goods → 'product'.
UPDATE public.categories SET kind = 'product' WHERE slug IN (
  -- Food & Beverage
  'food-beverages', 'meals-rice-dishes', 'snacks-street-food',
  'drinks-beverages', 'bakery-pastries', 'pasalubong-delicacies',
  -- Retail
  'clothing-apparel', 'electronics-gadgets', 'home-living',
  'groceries-essentials', 'handicrafts-souvenirs', 'books-stationery',
  'toys-hobbies', 'auto-motor-parts', 'hardware-construction',
  'agri-pet-supplies', 'medicine-pharmacy', 'sports-outdoor',
  'bags-footwear', 'baby-kids', 'jewelry-accessories', 'plants-garden',
  'drinking-water-refills',
  -- Global, product-shaped
  'gift-sets-bundles'
);

-- Unambiguous services → 'service'. Tourism & Leisure is included even though
-- its booking flow is on hold: its categories (rooms, tours, rentals, tickets)
-- are all service-shaped, and the vertical is 'both' by design.
UPDATE public.categories SET kind = 'service' WHERE slug IN (
  -- Services
  'hair-grooming', 'spa-massage', 'nails-lashes', 'fitness-classes',
  'repairs-maintenance', 'laundry-cleaning', 'pest-control-sanitation',
  -- Tourism & Leisure (mode 'both')
  'rooms-stays', 'tours-day-trips', 'workshops-experiences',
  'vehicle-rental', 'event-spaces', 'tickets-entry',
  -- Health / Education / Home (mode 'services')
  'health-medical', 'classes-training', 'home-services'
);

-- Deliberately LEFT NULL (either kind):
--   health-beauty            — global: a salon's services and a pharmacy's
--                              shelves alike, the same reason it stays global
--                              per vertical.
--   other                    — global catch-all; every picker needs it.
--   entertainment-events     — Entertainment & Events is mode 'both'; the
--                              category covers entry tickets AND goods sold
--                              at the venue.
