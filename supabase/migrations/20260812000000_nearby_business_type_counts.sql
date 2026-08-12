-- Availability signal for Explore's category filters.
--
-- `nearby_businesses` (the Explore feed) returns rows only for the ACTIVE
-- filter + page, so the client can't tell which business types (and their
-- sub-categories) actually have businesses in the radius — it only sees the
-- ones the current filter happens to return. This aggregate answers that
-- question directly: per (business_type, category_name), how many verified,
-- unarchived branches sit within the radius.
--
-- The mobile app uses it to hide empty categories from the Explore filter
-- dropdowns ("All / Food & Beverage / Retail / Services") and the
-- sub-category chips, so a category with no local businesses doesn't
-- advertise a dead filter. The geometry + status rules deliberately mirror
-- `nearby_businesses` (including the `radius_meters <= 0` "every business"
-- sentinel and the 100 km cap), so the two always agree on what "exists
-- nearby" means. Search and the active category/sub-category filters are
-- intentionally NOT applied: availability is a property of the area, not of
-- the current query — switching categories must never depend on the row set
-- the active filter happened to return.
CREATE OR REPLACE FUNCTION public.nearby_business_type_counts(
  lat FLOAT,
  lng FLOAT,
  radius_meters INT DEFAULT 5000
)
RETURNS TABLE (
  business_type TEXT,
  category_name TEXT,
  count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, postgis
AS $$
  SELECT
    bt.name  AS business_type,
    bc.name  AS category_name,
    COUNT(*) AS count
  FROM public.branches b
  JOIN public.businesses biz ON b.business_id = biz.id
  LEFT JOIN public.business_categories bc ON bc.id = biz.category_id
  LEFT JOIN public.business_types bt ON bt.id = bc.business_type_id
  WHERE
    biz.status = 'verified'
    AND biz.archived_at IS NULL
    AND b.location IS NOT NULL
    AND (
      radius_meters <= 0
      OR ST_DWithin(
           b.location,
           ST_MakePoint(lng, lat)::geography,
           LEAST(radius_meters, 100000)
         )
    )
  GROUP BY bt.name, bc.name
  ORDER BY bt.name, bc.name;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_business_type_counts(FLOAT, FLOAT, INT) TO anon, authenticated;
