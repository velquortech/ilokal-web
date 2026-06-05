-- Add sale price and validity window to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_price     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sale_ends_at   TIMESTAMPTZ;

-- sale_price must be positive when set
DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_sale_price_positive
      CHECK (sale_price IS NULL OR sale_price > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- sale_price must be strictly less than the base price when both are set
DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_sale_price_less_than_price
      CHECK (sale_price IS NULL OR price IS NULL OR sale_price < price);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- end date must come after start date when both are provided
DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_sale_dates_order
      CHECK (
        sale_ends_at IS NULL OR
        sale_starts_at IS NULL OR
        sale_ends_at > sale_starts_at
      );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Composite index for the most common owner query: filter by business + status
CREATE INDEX IF NOT EXISTS idx_products_business_status
  ON public.products (business_id, status);

-- Index for category filtering used in every paginated query
CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON public.products (category_id);

-- Partial index for active sale lookups — only rows that actually have an end date
CREATE INDEX IF NOT EXISTS idx_products_sale_ends_at
  ON public.products (sale_ends_at)
  WHERE sale_ends_at IS NOT NULL;
