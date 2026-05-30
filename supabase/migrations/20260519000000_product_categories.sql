-- ============================================================
-- 1. CREATE product categories table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER on_update_categories
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- 2. RLS — public read, admin-only write
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 3. ADD category_id + status columns to products
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived'));

-- ============================================================
-- 4. SEED — 5 product categories
-- ============================================================
INSERT INTO public.categories (name, slug, description) VALUES
  (
    'Food & Beverages',
    'food-beverages',
    'Ready-to-eat food, drinks, snacks, and dining items'
  ),
  (
    'Clothing & Apparel',
    'clothing-apparel',
    'Shirts, pants, dresses, shoes, and fashion accessories'
  ),
  (
    'Health & Beauty',
    'health-beauty',
    'Skincare, wellness products, vitamins, and personal care'
  ),
  (
    'Electronics & Gadgets',
    'electronics-gadgets',
    'Phones, accessories, tech tools, and electronic devices'
  ),
  (
    'Home & Living',
    'home-living',
    'Furniture, decor, kitchenware, and household essentials'
  )
ON CONFLICT (slug) DO NOTHING;
