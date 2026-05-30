-- SEC-06: Remove blanket public SELECT on profiles (PII exposure fix).
-- The USING (true) policy allowed any unauthenticated caller with the anon key
-- to read every user's email address and phone number via the REST API.
-- No application route uses the anon client to read other users' profiles —
-- all legitimate reads are authenticated (own profile) or admin (service role).
--
-- Replacement: explicit self-read policy so authenticated users can still
-- read their own profile row (required by getCurrentUser, assertAuthorized, etc.).

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Authenticated users may read their own profile row.
-- Admin reads are covered by the existing "Admins and service role manage all profiles" policy.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
