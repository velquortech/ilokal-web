-- ============================================================
-- Taxonomy backlog — what shops actually call things
-- (.claude/CATALOGUES.md — phase 6)
-- ------------------------------------------------------------
-- The point of splitting sections from categories was that owners write freely
-- in their OWN namespace, where a bad row embarrasses one shop instead of
-- landing in the platform's navigation. This report is the payoff: once a few
-- hundred shops have named their own sections, the names that recur ACROSS
-- shops are the global-category backlog, ranked by real demand — with no
-- request queue to build and no approval inbox for anyone to clear.
--
-- Read-only. Run as postgres / service role:
--
--   psql "$SUPABASE_DB_URL" -f supabase/reports/section_name_backlog.sql
--
-- ── How to read it ──────────────────────────────────────────────────────────
--   shops        DISTINCT businesses using the name. This is the signal.
--   offerings    live products sitting under it across those shops.
--   examples     up to 5 raw spellings, so an admin picks the wording rather
--                than inheriting a shouty one.
--
-- ── The promotion rule ──────────────────────────────────────────────────────
--   * `shops >= 5` is a candidate. One shop with a favourite word is not a
--     taxonomy — which is why this counts BUSINESSES, not rows: a single shop
--     with 30 sections must not be able to manufacture a trend.
--   * `offerings = 0` is not demand. A name nobody put anything under is an
--     experiment, not a category.
--   * Names that already exist as a category are excluded; they are not
--     backlog, they are done.
--   * Promotion is an ADMIN INSERT into `categories`, by hand, with a slug and
--     a `business_type_id` chosen deliberately (or NULL for global). This
--     report never writes anything, and nothing here should ever be automated
--     into a category: the reason the taxonomy is curated is that a human has
--     to decide "Kape" and "Coffee" are the same thing.
-- ============================================================

WITH live AS (
  SELECT
    s.id,
    s.business_id,
    -- Normalised for grouping only; raw spellings are kept below.
    lower(btrim(s.name)) AS norm,
    s.name               AS raw
  FROM public.product_sections s
  JOIN public.businesses b ON b.id = s.business_id
  WHERE s.archived_at IS NULL
    AND b.archived_at IS NULL
    -- An unverified shop is not evidence of anything yet.
    AND b.status = 'verified'
),
counted AS (
  SELECT
    l.norm,
    count(DISTINCT l.business_id) AS shops,
    count(DISTINCT p.id) FILTER (
      WHERE p.archived_at IS NULL AND p.status = 'active'
    ) AS offerings,
    (array_agg(DISTINCT l.raw))[1:5] AS examples
  FROM live l
  LEFT JOIN public.products p ON p.section_id = l.id
  GROUP BY l.norm
)
SELECT
  c.norm AS section_name,
  c.shops,
  c.offerings,
  c.examples,
  CASE
    WHEN c.shops >= 5 AND c.offerings > 0 THEN 'candidate'
    WHEN c.shops >= 5                     THEN 'named but empty'
    ELSE                                       'too few shops'
  END AS verdict
FROM counted c
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories cat
  WHERE lower(btrim(cat.name)) = c.norm
)
ORDER BY c.shops DESC, c.offerings DESC, c.norm;
