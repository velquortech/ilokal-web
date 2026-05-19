-- Replace the ambiguous JSONB business_category with a proper FK to business_categories.
-- The JSONB column is kept for now so existing registration forms don't break;
-- it can be dropped once the web registration form is updated to use category_id.

ALTER TABLE public.businesses
  ADD COLUMN category_id UUID REFERENCES public.business_categories(id) ON DELETE SET NULL;

-- Assign categories to the 5 seed businesses by matching against business_categories.name
UPDATE public.businesses SET category_id = (
  SELECT id FROM public.business_categories WHERE name = 'Café' LIMIT 1
) WHERE id = '11111111-1111-1111-1111-111111111101';  -- The Artisan Roastery

UPDATE public.businesses SET category_id = (
  SELECT id FROM public.business_categories WHERE name = 'Bakery / Pastry Shop' LIMIT 1
) WHERE id = '11111111-1111-1111-1111-111111111102';  -- Flora & Flour Bakery

UPDATE public.businesses SET category_id = (
  SELECT id FROM public.business_categories WHERE name = 'Specialty Shop' LIMIT 1
) WHERE id = '11111111-1111-1111-1111-111111111103';  -- The Handy Corner

UPDATE public.businesses SET category_id = (
  SELECT id FROM public.business_categories WHERE name = 'Salon / Barbershop' LIMIT 1
) WHERE id = '11111111-1111-1111-1111-111111111104';  -- Aura Hair Studio

UPDATE public.businesses SET category_id = (
  SELECT id FROM public.business_categories WHERE name = 'Restaurant' LIMIT 1
) WHERE id = '11111111-1111-1111-1111-111111111105';  -- Luna & Leaf Bistro
