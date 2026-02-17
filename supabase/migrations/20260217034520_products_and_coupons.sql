-- 1. Products Table
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- 2. Coupons Table
CREATE TABLE public.coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type public.coupon_type DEFAULT 'discount',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  redeem_time_limit_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- 3. RLS Policies (Applied to both tables similarly)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- (Policies omitted for brevity, but they follow the exact same pattern as 'branches': 
-- Public Read if Business Verified, Owner Write if Own Business, Admin Full Access)

-- 4. Triggers
CREATE TRIGGER on_update_products BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_update_coupons BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
