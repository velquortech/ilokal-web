-- Dev seed: 5 verified businesses near Iloilo City Plaza (lat 10.6973, lng 122.5649)
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

-- Branches within 5 km of Iloilo City Plaza (lat 10.6973, lng 122.5649)
-- PostGIS POINT order is (lng, lat)
INSERT INTO public.branches (id, business_id, name, address, location)
VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'City Proper',
    'Iznart St., City Proper, Iloilo City',
    ST_MakePoint(122.5732, 10.6969)::geography   -- ~0.9 km
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111102',
    'Jaro',
    'Rizal St., Jaro, Iloilo City',
    ST_MakePoint(122.5660, 10.7300)::geography   -- ~3.6 km
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    'Mandurriao',
    'Benigno Aquino Ave., Mandurriao, Iloilo City',
    ST_MakePoint(122.5440, 10.7162)::geography   -- ~3.0 km
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111104',
    'Molo',
    'Yulo St., Molo, Iloilo City',
    ST_MakePoint(122.5572, 10.6847)::geography   -- ~1.6 km
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111105',
    'La Paz',
    'Jalandoni St., La Paz, Iloilo City',
    ST_MakePoint(122.5566, 10.7200)::geography   -- ~2.6 km
  )
ON CONFLICT (id) DO NOTHING;

SET session_replication_role = DEFAULT;
