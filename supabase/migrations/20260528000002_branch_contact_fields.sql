ALTER TABLE branches
  ADD COLUMN phone VARCHAR(50),
  ADD COLUMN email VARCHAR(255),
  ADD COLUMN description TEXT;

-- Rollback:
-- ALTER TABLE branches DROP COLUMN IF EXISTS phone;
-- ALTER TABLE branches DROP COLUMN IF EXISTS email;
-- ALTER TABLE branches DROP COLUMN IF EXISTS description;
