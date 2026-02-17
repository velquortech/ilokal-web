-- 1. Table Schema
CREATE TABLE public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL, 
  address TEXT,
  location GEOGRAPHY(POINT), -- PostGIS Type
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- 2. Indexing (Crucial for Map Performance)
CREATE INDEX branches_location_idx ON public.branches USING GIST (location);

-- 3. RLS Policies
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view branches of verified businesses" 
ON public.branches FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = branches.business_id AND status = 'verified'
  )
);

CREATE POLICY "Owners manage own branches" 
ON public.branches FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = branches.business_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Admins manage all branches" 
ON public.branches FOR ALL 
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- 4. Trigger
CREATE TRIGGER on_update_branches
BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
