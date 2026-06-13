-- Distinct product categories that have at least one product for a business —
-- powers the category filter on the mobile menu/products screen
-- (app/api/mobile/businesses/[businessId]/products).
CREATE OR REPLACE FUNCTION public.business_product_categories(p_business_id UUID)
RETURNS TABLE (
  id   UUID,
  name TEXT,
  slug TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT c.id, c.name, c.slug
  FROM public.products p
  JOIN public.categories c ON c.id = p.category_id
  WHERE p.business_id = p_business_id
  ORDER BY c.name;
$$;

GRANT EXECUTE ON FUNCTION public.business_product_categories(UUID) TO anon, authenticated;
