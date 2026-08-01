-- ============================================================
-- Shop sections — the owner-editable half of "catalogues"
-- (.claude/CATALOGUES.md — phase 1)
-- ------------------------------------------------------------
-- `categories` is the PLATFORM taxonomy: admin-write, anon-read, the axis
-- customers filter and search by, and the thing slugs and cross-shop analytics
-- are built on. It must stay curated — 500 shops writing to it produces
-- "Coffee", "coffees", "Kape", "COFFEE" and the explore filter stops meaning
-- anything. The dashboard's "Manage Catalogues" drawer implied owners could
-- add to it; they never could (RLS is admin-only), so the UI was a mock and
-- has been removed.
--
-- What an owner actually wants is not taxonomy — it is MERCHANDISING: the
-- headings on their own menu ("Hot drinks", "Pasalubong", "Weekend specials").
-- That is shop-local, needs no curation, and a bad row embarrasses exactly one
-- shop instead of appearing in the platform's navigation.
--
-- So: two planes, two tables. A product carries BOTH `category_id` (how
-- strangers find it) and `section_id` (how this shop arranges it).
--
-- Deliberately NOT a nullable `business_id` on `categories`. That shortcut
-- makes every read depend on remembering a filter, and the one query that
-- forgets leaks a shop's private naming into the global picker — the same
-- class of mistake as the `USING (true)` policy that exposed the whole follow
-- graph (20260607000000, dropped in 20260608000001).
--
-- Additive throughout: no existing column changes meaning, and every existing
-- query returns identical rows.
--
-- Rollback: DROP TABLE public.product_sections CASCADE, ALTER TABLE
-- public.products DROP COLUMN section_id, DROP FUNCTION
-- public.section_product_counts(uuid).
-- ============================================================

CREATE TABLE public.product_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  -- 40 chars because this renders as a heading in the shop's nav; the
  -- notifications table caps its title text for the same reason.
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  -- The owner orders their own menu. Drinks before desserts is information,
  -- not a preference, so it is stored rather than sorted alphabetically.
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

COMMENT ON TABLE public.product_sections IS
  'Owner-defined groupings of a single shop''s offerings (menu sections, '
  'collections). Presentation only — the discovery axis is public.categories, '
  'which stays admin-curated.';

-- The list read is "this shop's live sections, in order".
CREATE INDEX idx_product_sections_business_position
  ON public.product_sections (business_id, position)
  WHERE archived_at IS NULL;

-- Same-shop duplicates die here rather than in a form validator, and
-- case-insensitively: "Hot Drinks" and "hot drinks" are the same section to
-- everyone except a naive UNIQUE. Scoped to live rows, so archiving a section
-- does not permanently reserve its name.
CREATE UNIQUE INDEX uq_product_sections_business_name
  ON public.product_sections (business_id, lower(btrim(name)))
  WHERE archived_at IS NULL;

ALTER TABLE public.product_sections ENABLE ROW LEVEL SECURITY;

-- Public read: live sections of verified, non-archived businesses. Mirrors the
-- business_posts gate exactly — NOT a blanket USING (true).
CREATE POLICY "Public view sections of verified businesses"
ON public.product_sections FOR SELECT
USING (
  archived_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = product_sections.business_id
      AND b.status = 'verified'
      AND b.archived_at IS NULL
  )
);

-- Owner manages their own shop's sections. WITH CHECK is written out rather
-- than left to default to USING: a FOR ALL policy silently reuses its USING
-- clause for writes, and the PR #18 review found that pattern letting rows be
-- rewritten in ways the author never intended. Stating it makes the write rule
-- reviewable on its own.
-- `(select auth.uid())` per the RLS initPlan standard (20260717000002) — a
-- bare auth.uid() re-evaluates once per row scanned.
CREATE POLICY "Owners manage own shop sections"
ON public.product_sections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = product_sections.business_id
      AND b.owner_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = product_sections.business_id
      AND b.owner_id = (select auth.uid())
  )
);

CREATE POLICY "Admins manage all shop sections"
ON public.product_sections FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER on_update_product_sections
BEFORE UPDATE ON public.product_sections
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------
-- Cap: a shop may hold 30 live sections.
--
-- Unbounded sections is unbounded nav on the public page, and an obvious spam
-- surface for a table that renders user text. A count-then-insert race is
-- acceptable here in a way it would not be for money or inventory: the worst
-- outcome is a shop with 31 sections.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_product_section_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.product_sections
  WHERE business_id = NEW.business_id
    AND archived_at IS NULL;

  IF v_count >= 30 THEN
    -- Private SQLSTATE class, like the booking RPCs: 22023 and its neighbours
    -- are also raised by built-ins, so forwarding their text can leak
    -- Postgres internals to a client.
    RAISE EXCEPTION 'A shop can have at most 30 sections.'
      USING ERRCODE = 'IL003';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_product_section_cap()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_product_sections_cap
BEFORE INSERT ON public.product_sections
FOR EACH ROW EXECUTE FUNCTION public.enforce_product_section_cap();

-- ------------------------------------------------------------
-- products.section_id
-- ------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN section_id UUID REFERENCES public.product_sections(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.products.section_id IS
  'Optional shop-local grouping. NULL = Uncategorised. Independent of '
  'category_id, which is the platform taxonomy used for discovery.';

-- Postgres does not auto-index foreign keys; this one is read on every
-- catalogue page load and every public shop page render.
CREATE INDEX idx_products_business_section
  ON public.products (business_id, section_id)
  WHERE archived_at IS NULL;

-- Archiving a section must never take inventory with it. A soft delete would
-- leave `section_id` pointing at a hidden row, which every future query would
-- have to remember to filter — so the pointer is cleared here instead and
-- those products fall into Uncategorised. One place to get right, not N.
CREATE OR REPLACE FUNCTION public.release_products_from_archived_section()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
    UPDATE public.products
    SET section_id = NULL
    WHERE section_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.release_products_from_archived_section()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_product_sections_release_products
AFTER UPDATE OF archived_at ON public.product_sections
FOR EACH ROW EXECUTE FUNCTION public.release_products_from_archived_section();

-- ------------------------------------------------------------
-- Counts per section
--
-- In SQL, not in Node: PostgREST caps a response at 1000 rows
-- (supabase/config.toml max_rows), so a fetch-all-then-reduce silently reports
-- WRONG counts for any shop past that — the exact failure the 2026-07-17 audit
-- found four times over.
--
-- SECURITY INVOKER, unlike the analytics RPCs. Those bypass RLS deliberately,
-- because they aggregate for a business whose ownership the caller has already
-- been verified against. Here RLS already expresses exactly the right scope —
-- an owner sees their own products, anon sees a verified shop's public ones —
-- so running as the caller makes over-reporting impossible by construction. A
-- DEFINER function would have to re-implement that check and could get it
-- wrong.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.section_product_counts(p_business_id UUID)
RETURNS TABLE (
  section_id UUID,
  product_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT p.section_id, count(*)::BIGINT
  FROM public.products p
  WHERE p.business_id = p_business_id
    AND p.archived_at IS NULL
  GROUP BY p.section_id;
$$;

COMMENT ON FUNCTION public.section_product_counts(UUID) IS
  'Live product counts per section for one business, including a NULL '
  'section_id row for Uncategorised. Runs as the caller, so RLS decides what '
  'is counted.';

REVOKE ALL ON FUNCTION public.section_product_counts(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.section_product_counts(UUID) TO anon, authenticated;
