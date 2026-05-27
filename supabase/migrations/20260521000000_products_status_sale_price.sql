-- Ensure the product categories table exists (used by productQuery.ts).
-- This is distinct from business_categories (shop registration type/category).
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add status column for web dashboard visibility control.
-- Kept alongside is_available so the mobile app filter (is_available = true) is never broken.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'unlisted', 'disabled'));

-- Add sale_price for the ApplySale feature.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2) NULL;

-- Add category_id FK pointing to the platform-wide categories table.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID
    REFERENCES public.categories(id) ON DELETE SET NULL;

-- Sync trigger: whenever status changes, keep is_available in sync so mobile reads remain correct.
-- active → is_available = true; unlisted / disabled → is_available = false
CREATE OR REPLACE FUNCTION public.sync_product_availability()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_available := (NEW.status = 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_product_status_change ON public.products;

CREATE TRIGGER on_product_status_change
  BEFORE INSERT OR UPDATE OF status ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_availability();

-- Backfill: align any existing rows so status reflects the current is_available value.
UPDATE public.products
  SET status = CASE WHEN is_available THEN 'active' ELSE 'unlisted' END
  WHERE status = 'active' AND is_available = false;
