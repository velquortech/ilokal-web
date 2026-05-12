-- Add status column to profiles.
-- The column is referenced throughout the codebase (auth, admin, business service)
-- but was never added to the table definition.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended'));

-- Back-fill any existing rows that may have a NULL (shouldn't exist, but defensive).
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;
