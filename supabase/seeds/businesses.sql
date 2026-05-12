-- Dev seed: 5 verified businesses near Manila Bay (lat 14.5995, lng 120.9842)
-- Run as service role. session_replication_role bypasses auth.users FK for the seed owner.
-- Images are served from local Supabase storage (interior-images / shop-logos buckets).
-- Storage URL base: http://127.0.0.1:54321/storage/v1/object/public

SET session_replication_role = replica;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'seedowner@ilokal.dev', 'Seed Owner', 'business_owner')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.businesses (id, owner_id, shop_name, description, logo_url, interior_images, status, category_id)
VALUES
  (
    '11111111-1111-1111-1111-111111111101',
    '00000000-0000-0000-0000-000000000001',
    'The Artisan Roastery',
    'Specialty coffee roasted in-house daily using single-origin beans from Benguet and Sagada.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111101/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111101/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111101/gallery1.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111101/gallery2.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Café' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111102',
    '00000000-0000-0000-0000-000000000001',
    'Flora & Flour Bakery',
    'Artisanal Filipino breads and pastries baked fresh every morning.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111102/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111102/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111102/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Bakery / Pastry Shop' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111103',
    '00000000-0000-0000-0000-000000000001',
    'The Handy Corner',
    'Your trusted neighborhood hardware and home improvement store.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111103/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111103/hero.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Specialty Shop' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111104',
    '00000000-0000-0000-0000-000000000001',
    'Aura Hair Studio',
    'Premium hair styling, coloring, and treatments by certified and experienced stylists.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111104/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111104/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111104/gallery1.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111104/gallery2.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Salon / Barbershop' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111105',
    '00000000-0000-0000-0000-000000000001',
    'Luna & Leaf Bistro',
    'Farm-to-table bistro serving organic coffee and healthy Filipino-inspired bowls.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111105/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111105/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111105/gallery1.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111105/gallery2.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Restaurant' LIMIT 1)
  )
ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id;

-- Branches within 5 km of Manila Bay (lat 14.5995, lng 120.9842)
-- PostGIS POINT order is (lng, lat)
INSERT INTO public.branches (id, business_id, name, address, location)
VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'Ermita',
    'Mabini St., Ermita, Manila',
    ST_MakePoint(120.9836, 14.5826)::geography   -- ~1.9 km
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111102',
    'Binondo',
    'Ongpin St., Binondo, Manila',
    ST_MakePoint(120.9760, 14.5985)::geography   -- ~0.9 km
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    'Paco',
    'San Andres St., Paco, Manila',
    ST_MakePoint(120.9975, 14.5738)::geography   -- ~3.2 km
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111104',
    'Malate',
    'Adriatico St., Malate, Manila',
    ST_MakePoint(120.9836, 14.5797)::geography   -- ~2.2 km
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111105',
    'San Miguel',
    'General Luna St., San Miguel, Manila',
    ST_MakePoint(120.9985, 14.6076)::geography   -- ~1.8 km
  )
ON CONFLICT (id) DO NOTHING;

SET session_replication_role = DEFAULT;
