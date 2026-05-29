ALTER TABLE coupons
  ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX idx_coupons_branch_id ON coupons(branch_id) WHERE branch_id IS NOT NULL;

-- Rollback:
-- DROP INDEX IF EXISTS idx_coupons_branch_id;
-- ALTER TABLE coupons DROP COLUMN IF EXISTS branch_id;
