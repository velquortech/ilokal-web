-- ============================================================
-- Offerings model — phase 1: discriminators
-- (.claude/OFFERINGS_MODEL.md — OF2, OF3, OF4)
-- ------------------------------------------------------------
-- `products` is not a retail-only table: it already carries service/rental
-- pricing (`price_type` per_hour/per_day/per_person/per_event since
-- 20260511000001). What is missing is a way to say WHAT a row is, WHAT a
-- business sells, and which categories belong to which vertical.
--
-- Three layers, each with a distinct job (decision D-model in the plan doc):
--   * business_types.offering_profile  — vertical template          (phase 2)
--   * businesses.offering_mode         — declared intent, drives UI  (here)
--   * products.kind                    — ground truth per row        (here)
--
-- Everything here is ADDITIVE and DEFAULTED: existing rows keep today's
-- behavior, every existing query returns byte-identical results, and no RLS
-- policy changes (all policies on these tables are column-agnostic — the new
-- columns are non-sensitive display metadata that ride the existing public
-- SELECT on verified businesses).
--
-- Rollback: DROP the four columns + three indexes. No data loss — nothing is
-- moved or destroyed, only annotated.
-- ============================================================

-- ------------------------------------------------------------
-- OF2 — products.kind: what this offering actually is.
-- Deliberately coarse. HOW a thing transacts (inquiry / appointment /
-- date-range rental) is a separate axis, added as `booking_mode` in phase 3 —
-- keeping them apart is what stops `kind` sprawling into
-- product|service|rental|room|tour|…
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'product'
    CHECK (kind IN ('product', 'service'));

COMMENT ON COLUMN public.products.kind IS
  'Ground truth for what this offering is. Queries/filters use this; UI '
  'vocabulary comes from businesses.offering_mode. See .claude/OFFERINGS_MODEL.md.';

-- Postgres does not auto-index anything here; the catalogue and public menu
-- both filter business + status, and phase 2+ adds kind to that predicate.
CREATE INDEX IF NOT EXISTS idx_products_business_kind_status
  ON public.products (business_id, kind, status);

-- ------------------------------------------------------------
-- OF3 — businesses.offering_mode + a denormalized business_type_id.
--
-- offering_mode is DECLARED INTENT, not a derived value: it must be stored,
-- never computed by scanning products at read time (a business with zero rows
-- would be "unknown", and it costs a per-row scan on every page). 'both'
-- exists because mixed businesses are normal — a salon sells shampoo, a cafe
-- rents its function room.
--
-- business_type_id is reachable today only via
-- businesses -> business_categories -> business_types. Denormalizing it makes
-- type-driven behavior (phase 2's offering_profile lookup, category scoping) a
-- single-column read instead of a two-hop join on every render.
-- ------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN offering_mode TEXT NOT NULL DEFAULT 'products'
    CHECK (offering_mode IN ('products', 'services', 'both')),
  ADD COLUMN business_type_id UUID
    REFERENCES public.business_types(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.businesses.offering_mode IS
  'Declared intent — drives catalogue vocabulary, which form fields render, '
  'and the explore Products/Services filter. Owner-editable; seeded from '
  'business type. Never derive this by scanning products.';

COMMENT ON COLUMN public.businesses.business_type_id IS
  'Denormalized from business_categories.business_type_id. Kept in sync by '
  'trg_businesses_sync_business_type.';

CREATE INDEX IF NOT EXISTS idx_businesses_business_type_id
  ON public.businesses (business_type_id);

-- Backfill from the existing category chain. Every seeded/live business has a
-- category today, so this leaves no NULLs; a NULL simply means "no category
-- chosen" and the app falls back to retail defaults.
UPDATE public.businesses b
   SET business_type_id = bc.business_type_id
  FROM public.business_categories bc
 WHERE bc.id = b.category_id
   AND b.business_type_id IS DISTINCT FROM bc.business_type_id;

-- Keep the denormalized column honest. Without this, changing a business's
-- category silently leaves the old type behind — and every type-driven label
-- in phase 2 would then be wrong with no visible cause.
CREATE OR REPLACE FUNCTION public.sync_business_type_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.category_id IS NULL THEN
    NEW.business_type_id := NULL;
  ELSE
    SELECT bc.business_type_id INTO NEW.business_type_id
      FROM public.business_categories bc
     WHERE bc.id = NEW.category_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_business_type_id() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_businesses_sync_business_type ON public.businesses;
CREATE TRIGGER trg_businesses_sync_business_type
  BEFORE INSERT OR UPDATE OF category_id ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_business_type_id();

-- ------------------------------------------------------------
-- Seed offering_mode from the business type.
--
-- Best-effort heuristic matched on business_types.name (admin-editable text —
-- a rename on cloud simply means no match, and the column keeps its
-- 'products' default). Owners and admins can change it afterwards; nothing
-- downstream treats it as immutable.
--
--   Services          -> 'services'  (salon, spa, gym, repair — no goods)
--   Tourism & Leisure -> 'both'      (a B&B sells rooms AND breakfast; a
--                                     venue sells tickets AND drinks)
--   Food & Beverage   -> 'products'  (default, left alone)
--   Retail            -> 'products'  (default, left alone)
-- ------------------------------------------------------------
UPDATE public.businesses b
   SET offering_mode = 'services'
  FROM public.business_types bt
 WHERE bt.id = b.business_type_id
   AND bt.name = 'Services';

UPDATE public.businesses b
   SET offering_mode = 'both'
  FROM public.business_types bt
 WHERE bt.id = b.business_type_id
   AND bt.name = 'Tourism & Leisure';

-- Backfill products.kind to match, for the unambiguous case only. A pure
-- services business cannot be selling goods, so flipping its rows is safe and
-- saves the owner hand-editing every row. 'both' businesses are genuinely
-- ambiguous per row — they stay 'product' until the owner says otherwise.
UPDATE public.products p
   SET kind = 'service'
  FROM public.businesses b
  JOIN public.business_types bt ON bt.id = b.business_type_id
 WHERE b.id = p.business_id
   AND bt.name = 'Services'
   AND p.kind <> 'service';

-- ------------------------------------------------------------
-- OF4 — scope the offering-category picker to a vertical.
--
-- `categories` (product categories) is flat and global, unlike
-- `business_categories` which already hangs off a type. So a salon's category
-- dropdown lists "Pastries" next to "Haircut", and it gets worse with every
-- vertical onboarded. NULL = global/uncategorized, shown to everyone — that
-- is what every existing row becomes, so today's picker is unchanged until
-- categories are deliberately assigned.
-- ------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN business_type_id UUID
    REFERENCES public.business_types(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.categories.business_type_id IS
  'Optional vertical scope for the offering-category picker. NULL = global '
  '(shown for every business type).';

CREATE INDEX IF NOT EXISTS idx_categories_business_type_id
  ON public.categories (business_type_id);
