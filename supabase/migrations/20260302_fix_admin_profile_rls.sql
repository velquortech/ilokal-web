-- Fix RLS Policies for Admin Profile Management
-- Issue: Service role connections need explicit policies to work with RLS
-- Solution: Recreate all policies with proper handling for both authenticated and service role access

-- 1. Drop all existing policies on profiles table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and service role manage all profiles" ON public.profiles;

-- 2. Ensure the helper function exists and works correctly
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  v_auth_uid uuid;
BEGIN
  v_auth_uid := auth.uid();
  
  -- If no auth.uid() (service role), allow
  IF v_auth_uid IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if authenticated user is an admin
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_auth_uid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Policy: Public read access
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- 4. Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- 5. Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Policy: Admins and service role have full access (for all operations)
CREATE POLICY "Admins and service role manage all profiles"
ON public.profiles FOR ALL
USING (is_admin())
WITH CHECK (is_admin());
