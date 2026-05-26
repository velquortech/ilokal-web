-- SEC-03: Replace direct profile lookups with is_admin() in categories and ratings.
-- Direct lookups (EXISTS SELECT FROM profiles WHERE role = 'admin') are fragile:
-- any future change to the profiles admin policy can reintroduce infinite recursion.
-- The SECURITY DEFINER is_admin() function breaks that cycle permanently.

-- categories: replace direct lookup
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ratings: was DELETE-only via direct lookup; promote to ALL via is_admin()
-- Admins should also be able to view and moderate ratings, not just delete.
DROP POLICY IF EXISTS "ratings_admin_delete" ON public.ratings;
CREATE POLICY "ratings_admin_all"
  ON public.ratings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
