-- Public rating summary for customer-facing cards/profiles.
-- Mirrors the get_follower_counts contract: aggregate-only (no user_id or
-- comment text leaves the function), SECURITY DEFINER with pinned search_path,
-- callable by anon/authenticated for verified, non-archived businesses only.
-- Needed because PostgREST aggregates are disabled and a fetch-all client-side
-- average silently truncates at max_rows=1000 (repo standard: aggregate in SQL).

CREATE OR REPLACE FUNCTION public.get_business_rating_summary(
  p_business_ids uuid[]
)
RETURNS TABLE (
  business_id uuid,
  rating_average numeric,
  rating_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    br.business_id,
    ROUND(AVG(br.rating)::numeric, 2) AS rating_average,
    COUNT(*)::bigint AS rating_count
  FROM public.business_ratings br
  JOIN public.businesses b
    ON b.id = br.business_id
   AND b.status = 'verified'
   AND b.archived_at IS NULL
  WHERE br.business_id = ANY (p_business_ids)
  GROUP BY br.business_id;
$$;

REVOKE ALL ON FUNCTION public.get_business_rating_summary(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_rating_summary(uuid[])
  TO anon, authenticated, service_role;
