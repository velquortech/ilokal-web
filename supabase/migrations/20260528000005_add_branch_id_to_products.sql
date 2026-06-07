-- Migration: add optional branch_id to products
-- Products remain business-level by default (branch_id = NULL = available at all branches).
-- When branch_id is set, the product belongs to that specific branch only.
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_products_branch_id;
--   ALTER TABLE products DROP COLUMN IF EXISTS branch_id;

ALTER TABLE products
  ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX idx_products_branch_id ON products(branch_id)
  WHERE branch_id IS NOT NULL;
