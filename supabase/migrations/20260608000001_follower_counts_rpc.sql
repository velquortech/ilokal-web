-- Replace the over-broad public read on `follows` with a counts-only RPC.
--
-- `20260607000000_public_read_follows.sql` added `USING (true)` SELECT so the
-- anon role could COUNT followers — but that also exposes every `user_id ↔
-- business_id` row (the whole follow graph) to anyone holding the public
-- publishable key. The mobile feeds only need aggregate counts, so serve those
-- through a SECURITY DEFINER function and drop the row-level exposure. The
-- "Users manage own follows" (self) and "Admins manage all follows" policies
-- remain, so authenticated self-reads (Updates feed, itinerary) still work.

DROP POLICY IF EXISTS "Public follows are viewable by everyone" ON public.follows;

-- Aggregate follower counts for a set of businesses. Returns only counts — never
-- user ids — so the follow graph stays private. SECURITY DEFINER because the
-- anon/authenticated caller has no row-level read on other users' follows.
CREATE OR REPLACE FUNCTION public.get_follower_counts(p_business_ids uuid[])
RETURNS TABLE (business_id uuid, follower_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.business_id, COUNT(*)::bigint AS follower_count
  FROM public.follows f
  WHERE f.business_id = ANY(p_business_ids)
  GROUP BY f.business_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_follower_counts(uuid[]) TO anon, authenticated;
