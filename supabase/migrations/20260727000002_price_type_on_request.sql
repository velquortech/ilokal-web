-- ============================================================
-- Offerings model — phase 3a: quote-based pricing
-- (.claude/OFFERINGS_MODEL.md — OF7)
-- ------------------------------------------------------------
-- Services and rentals are routinely priced on request: an event package, a
-- long-term van hire, a custom repair. `products.price` is already NULLable at
-- the column level — what's missing is a way to SAY "no number, ask us", so
-- the UI can render "Price on request" instead of an accidental blank.
--
-- Deliberately its own migration file: Postgres allows ADD VALUE inside a
-- transaction, but the new value cannot be USED in that same transaction — the
-- CHECK constraint in 20260727000003 references 'on_request', so it must run
-- in a later transaction or fail with
-- "unsafe use of new value ... of enum type price_type".
--
-- Rollback: an enum value cannot be dropped. Reverting phase 3 leaves
-- 'on_request' present but unused, which is inert.
-- ============================================================

ALTER TYPE public.price_type ADD VALUE IF NOT EXISTS 'on_request';
