-- The admin RLS policies on all tables use:
--   auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
-- When any of those tables is queried, Postgres evaluates every policy including the admin one.
-- The admin check reads from profiles, which triggers profiles' own admin policy, which reads
-- profiles again — infinite recursion.
--
-- Fix: a SECURITY DEFINER function bypasses RLS when it reads profiles, breaking the cycle.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- profiles
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
ON public.profiles FOR ALL
USING (public.is_admin());

-- businesses
DROP POLICY IF EXISTS "Admins manage all businesses" ON public.businesses;
CREATE POLICY "Admins manage all businesses"
ON public.businesses FOR ALL
USING (public.is_admin());

-- branches
DROP POLICY IF EXISTS "Admins manage all branches" ON public.branches;
CREATE POLICY "Admins manage all branches"
ON public.branches FOR ALL
USING (public.is_admin());

-- products (policy name inferred from the migration comment pattern)
DROP POLICY IF EXISTS "Admins manage all products" ON public.products;
CREATE POLICY "Admins manage all products"
ON public.products FOR ALL
USING (public.is_admin());

-- coupons
DROP POLICY IF EXISTS "Admins manage all coupons" ON public.coupons;
CREATE POLICY "Admins manage all coupons"
ON public.coupons FOR ALL
USING (public.is_admin());
