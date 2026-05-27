-- Migration 20260519000000 added status with CHECK ('active','inactive','archived').
-- The app and seed use ('active','unlisted','disabled') per lib/types/product.ts.
-- Replace the constraint to match the application type.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_status_check
    CHECK (status IN ('active', 'unlisted', 'disabled'));

-- Backfill any rows that were written with the old values.
UPDATE public.products SET status = 'unlisted' WHERE status = 'inactive';
UPDATE public.products SET status = 'disabled' WHERE status = 'archived';
