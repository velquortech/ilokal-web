-- Create ratings table (was referenced by API but missing from schema)

-- 1. Table Schema
CREATE TABLE public.ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- 2. Indexes
CREATE INDEX idx_ratings_user_id ON public.ratings(user_id);
CREATE INDEX idx_ratings_product_id ON public.ratings(product_id);
CREATE INDEX idx_ratings_business_id ON public.ratings(business_id);
CREATE INDEX idx_ratings_created_at ON public.ratings(created_at DESC);

-- 3. RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings
CREATE POLICY "ratings_anyone_read" ON public.ratings FOR SELECT USING (true);

-- Users can create their own ratings
CREATE POLICY "ratings_user_create" ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "ratings_user_update" ON public.ratings FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can delete any rating
CREATE POLICY "ratings_admin_delete" ON public.ratings FOR DELETE
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  );

-- 4. Trigger for automatic updated_at
CREATE TRIGGER on_update_ratings
BEFORE UPDATE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
