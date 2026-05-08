CREATE TABLE public.business_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, business_id)
);

ALTER TABLE public.business_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public ratings are viewable by everyone"
ON public.business_ratings FOR SELECT
USING (true);

CREATE POLICY "Users manage own ratings"
ON public.business_ratings FOR ALL
USING (auth.uid() = user_id);

CREATE TRIGGER on_update_business_ratings
BEFORE UPDATE ON public.business_ratings
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
