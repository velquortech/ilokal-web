-- ============================================================
-- Scope the offering-category picker to a shop's vertical
-- (.claude/CATALOGUES.md — phase 5)
-- ------------------------------------------------------------
-- `categories.business_type_id` has existed since 20260727000000 and is NULL
-- on every row, so the picker still offers a salon "Pastries" and an
-- electronics shop "Food & Beverages".
--
-- The rule the app applies is "this vertical's categories PLUS the global
-- ones", so NULL keeps its meaning: available everywhere. That is what makes
-- this safe to get wrong — an unmapped or renamed row simply stays global
-- rather than disappearing from every picker.
--
-- Health & Beauty is deliberately LEFT GLOBAL. It spans a salon's services and
-- a pharmacy's products, and pinning it to one vertical would take it away
-- from the other. Ambiguous categories stay global; only unambiguous ones get
-- pinned.
--
-- Services and Tourism intentionally end up with no vertical-specific
-- categories yet. Inventing them here would be guessing; phase 6 reads the
-- section names owners actually type and turns the recurring ones into real
-- categories.
--
-- Data-only apart from one index. Rollback:
--   UPDATE public.categories SET business_type_id = NULL;
-- ============================================================

-- Matched on the admin-editable business-type NAME. A rename on cloud simply
-- means no match, and the category stays global — the same best-effort shape
-- as the 20260727000000 backfill.
--
-- On a FRESH database this matches ZERO rows: business_types are created by
-- the SEED, which runs after migrations. `supabase/seeds/business_categories.sql`
-- repeats this mapping (COALESCE'd) for exactly that reason — the same trap
-- that left every offering_profile NULL after a migrate-reset.
UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Food & Beverage'
  AND c.slug = 'food-beverages'
  AND c.business_type_id IS NULL;

UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Retail'
  AND c.slug IN ('clothing-apparel', 'electronics-gadgets', 'home-living')
  AND c.business_type_id IS NULL;

-- The picker's read is "my vertical OR global"; Postgres does not auto-index
-- foreign keys.
CREATE INDEX IF NOT EXISTS idx_categories_business_type
  ON public.categories (business_type_id);

COMMENT ON COLUMN public.categories.business_type_id IS
  'Vertical this category belongs to. NULL = global (offered to every shop). '
  'The picker reads "this vertical OR NULL", so an unmapped row stays visible '
  'everywhere rather than disappearing.';
