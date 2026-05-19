-- Remove legacy is_verified boolean column; status enum is the authoritative field.
ALTER TABLE businesses DROP COLUMN IF EXISTS is_verified;
