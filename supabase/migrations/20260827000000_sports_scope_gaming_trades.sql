-- ============================================================
-- Sports & Recreation: hand the two computer/gaming trades back
-- ------------------------------------------------------------
-- 20260826000000 pulled five shop types into the new vertical. Two of them
-- were the wrong call and are returned here:
--
--   Computer / Internet Shop  →  Services              (where it came from)
--   Game Center / Arcade      →  Entertainment & Events (where it came from)
--
-- Both are TRUE reverts — each row goes back to the vertical it was in before
-- 20260826000000, so for these two trades that migration becomes a no-op.
--
-- Why, for the iCafe specifically: the live business on that row is named
-- "iCafe & Services", carries offering_mode='products', and its offerings are
-- RJ45 cables and per-hour PC time. It sells goods and does print/encode/scan
-- work alongside the gaming rigs — a Services shop, not a sports venue. The
-- earlier reasoning ("computer shops are a gaming trade") described half of it.
--
-- Billiards / Recreation Hall deliberately STAYS in Sports: a cue sport with
-- leagues whose business model — renting a table by the hour — is the same
-- shape as the badminton court this vertical is built around.
--
-- Sports & Recreation is left with: Sports / Outdoor Shop, Fitness Studio /
-- Gym, Billiards / Recreation Hall, Sports Court / Facility Rental, General.
--
-- RISK: MEDIUM. Re-pins live taxonomy rows and backfills the denormalized
-- column on one real business — the same shape as 20260826000000, at a third
-- of the size. No DDL: no table, column, policy, index or function changes.
--
-- ⚠️ ORDERING: 20260826000000 has NOT been applied to cloud. Both land
-- together, so production only ever sees the final placement.
--
-- Rollback: re-pin the two rows back to 'Sports & Recreation', re-run the
-- backfill in step 2, and re-pin 'gaming-console-time' to Sports.
-- ============================================================

-- ─── 1. hand the two shop types back ──────────────────────
--
-- Matched on (name, CURRENT vertical) so a re-run is a no-op and a same-named
-- row belonging elsewhere can never be captured — the same guard 20260826000000
-- used, and the reason business_categories needs one: it has NO unique index on
-- `name` (a 'Rentals' row legitimately exists under two verticals).
UPDATE public.business_categories bc
   SET business_type_id = target.id
  FROM public.business_types old,
       (VALUES
         ('Computer / Internet Shop', 'Services'),
         ('Game Center / Arcade',     'Entertainment & Events')
       ) AS m(cat_name, target_vertical)
       JOIN public.business_types target ON target.name = m.target_vertical
 WHERE old.id = bc.business_type_id
   AND old.name = 'Sports & Recreation'
   AND bc.name = m.cat_name;

-- ─── 2. backfill the businesses that moved with them ──────
--
-- businesses.business_type_id is denormalized and sync_business_type_id fires
-- only on INSERT or an UPDATE OF category_id — neither of which a re-pin
-- performs. Without this the shops on those two rows keep pointing at Sports &
-- Recreation and getCategoryDivergence starts showing their owners a banner.
--
-- offering_mode is deliberately NOT rewritten, for the same reason as in
-- 20260826000000: the one affected shop reads 'products', which is correct for
-- a business selling cables, and the trigger is INSERT-only precisely so a
-- settled value is never overwritten.
UPDATE public.businesses b
   SET business_type_id = bc.business_type_id
  FROM public.business_categories bc
 WHERE bc.id = b.category_id
   AND bc.name IN ('Computer / Internet Shop', 'Game Center / Arcade')
   AND b.business_type_id IS DISTINCT FROM bc.business_type_id;

-- ─── 3. move the gaming offering category with the trades ─
--
-- 'Gaming & Console Time' was created by 20260826000000 pinned to Sports. With
-- both gaming trades gone it would sit in a vertical that has nothing to use
-- it, while the arcade — whose picker reads "my vertical OR global" — could no
-- longer see it at all. It follows the arcade to Entertainment & Events.
--
-- The other three new categories stay in Sports: Court & Facility Time,
-- Coaching & Lessons and Equipment Rental all describe what the remaining
-- shop types sell.
UPDATE public.categories
   SET business_type_id = (
         SELECT id FROM public.business_types WHERE name = 'Entertainment & Events')
 WHERE slug = 'gaming-console-time'
   -- Guarded so a re-run reports 0 rows rather than rewriting the same value.
   AND business_type_id IS DISTINCT FROM (
         SELECT id FROM public.business_types WHERE name = 'Entertainment & Events');
