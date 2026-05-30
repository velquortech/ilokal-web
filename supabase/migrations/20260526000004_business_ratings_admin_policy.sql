-- SEC-05: Add admin moderation policy to business_ratings.
-- Previously there was no admin policy — admins could not delete offensive
-- or fraudulent ratings through the API.

DROP POLICY IF EXISTS "Admins manage all business ratings" ON public.business_ratings;

CREATE POLICY "Admins manage all business ratings"
  ON public.business_ratings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
