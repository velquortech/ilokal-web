-- SEC-04 + SEC-15: Pin search_path on all SECURITY DEFINER functions and add radius cap.
-- Without SET search_path, a malicious schema on the search path could shadow
-- public functions/tables inside a SECURITY DEFINER context.
-- The radius cap (LEAST 50 km) prevents full-table PostGIS scans from arbitrary clients.

-- nearby_businesses: full replacement with pinned search_path + radius cap
-- This supersedes all previous versions (20260508000000, 20260511000000, 20260515000000).
DROP FUNCTION IF EXISTS public.nearby_businesses(FLOAT, FLOAT, INT);

CREATE OR REPLACE FUNCTION public.nearby_businesses(
  lat            FLOAT,
  lng            FLOAT,
  radius_meters  INT DEFAULT 5000
)
RETURNS TABLE (
  branch_id            UUID,
  branch_name          TEXT,
  address              TEXT,
  distance_meters      FLOAT,
  business_id          UUID,
  business_name        TEXT,
  business_description TEXT,
  logo_url             TEXT,
  interior_images      TEXT[],
  average_rating       NUMERIC,
  rating_count         BIGINT,
  business_type        TEXT,
  category_name        TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, postgis
AS $$
  SELECT
    b.id              AS branch_id,
    b.name            AS branch_name,
    b.address,
    ST_Distance(b.location, ST_MakePoint(lng, lat)::geography) AS distance_meters,
    biz.id            AS business_id,
    biz.shop_name     AS business_name,
    biz.description   AS business_description,
    biz.logo_url,
    biz.interior_images,
    COALESCE(ROUND(AVG(br.rating)::numeric, 1), 0) AS average_rating,
    COALESCE(COUNT(br.id), 0)                       AS rating_count,
    bt.name           AS business_type,
    bc.name           AS category_name
  FROM public.branches b
  JOIN public.businesses biz ON b.business_id = biz.id
  LEFT JOIN public.business_categories bc ON bc.id = biz.category_id
  LEFT JOIN public.business_types bt ON bt.id = bc.business_type_id
  LEFT JOIN public.business_ratings br ON br.business_id = biz.id
  WHERE
    biz.status = 'verified'
    AND biz.archived_at IS NULL
    AND b.location IS NOT NULL
    AND ST_DWithin(
          b.location,
          ST_MakePoint(lng, lat)::geography,
          LEAST(radius_meters, 50000)  -- cap at 50 km — prevents full-table scan DoS
        )
  GROUP BY
    b.id, b.name, b.address, b.location,
    biz.id, biz.shop_name, biz.description, biz.logo_url, biz.interior_images,
    bt.name, bc.name
  ORDER BY distance_meters ASC;
$$;

-- grant_beta_on_verification: add pinned search_path (logic unchanged)
CREATE OR REPLACE FUNCTION public.grant_beta_on_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  beta_plan_id UUID;
BEGIN
  IF NEW.status = 'verified' AND (OLD.status IS DISTINCT FROM 'verified') THEN
    SELECT id INTO beta_plan_id
    FROM public.subscription_plans
    WHERE name = 'Beta Access'
    LIMIT 1;

    IF beta_plan_id IS NOT NULL THEN
      INSERT INTO public.business_subscriptions (
        business_id,
        plan_id,
        current_period_start,
        current_period_end,
        status
      ) VALUES (
        NEW.id,
        beta_plan_id,
        NOW(),
        NOW() + INTERVAL '3 months',
        'active'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
