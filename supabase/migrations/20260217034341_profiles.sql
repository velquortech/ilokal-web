-- 1. Table Schema
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone_number TEXT CHECK (
    phone_number IS NULL 
    OR phone_number ~ '^\+[1-9]\d{1,14}(\s\d+)?$'
  ),
  role TEXT NOT NULL CHECK (role IN ('admin', 'business_owner', 'app_user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- 2. RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read (needed for social features/reviews later)
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policy: Admins can do EVERYTHING
CREATE POLICY "Admins have full access to profiles" 
ON public.profiles FOR ALL 
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- 3. Trigger
CREATE TRIGGER on_update_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
