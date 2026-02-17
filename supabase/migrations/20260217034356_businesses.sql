-- 1. Table Schema
CREATE TABLE public.businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  interior_images TEXT[], 
  status public.verification_status DEFAULT 'pending',
  verification_docs_url TEXT[], 
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- 2. RLS Policies
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view ONLY verified businesses
CREATE POLICY "Public view verified businesses" 
ON public.businesses FOR SELECT 
USING (status = 'verified' AND archived_at IS NULL);

-- Policy: Business Owners can view/edit their OWN business
CREATE POLICY "Owners manage own business" 
ON public.businesses FOR ALL 
USING (auth.uid() = owner_id);

-- Policy: Admins can view/edit ALL businesses
CREATE POLICY "Admins manage all businesses" 
ON public.businesses FOR ALL 
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- 3. Trigger
CREATE TRIGGER on_update_businesses
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
