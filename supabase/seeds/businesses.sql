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

-- ── New businesses: one per remaining category ────────────────────────────────
INSERT INTO public.businesses (id, owner_id, shop_name, description, logo_url, interior_images, status, category_id)
VALUES
  (
    '11111111-1111-1111-1111-111111111106',
    '00000000-0000-0000-0000-000000000001',
    'El Tapas & Brew',
    'Craft beer taproom with rotating local brews and Spanish-inspired pulutan to share.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111106/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111106/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111106/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Bar / Pub' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111107',
    '00000000-0000-0000-0000-000000000001',
    'Iloilo Street Eats',
    'Authentic Ilonggo street food — isaw, BBQ skewers, fish balls, and steaming batchoy cups.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111107/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111107/hero.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Street Food Vendor' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111108',
    '00000000-0000-0000-0000-000000000001',
    'Sari-Sari ni Nena',
    'Your friendly neighborhood convenience store stocked with daily essentials, fresh eggs, and local snacks.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111108/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111108/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111108/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Local Grocery / Convenience Store' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111109',
    '00000000-0000-0000-0000-000000000001',
    'Hablon & Hue Boutique',
    'Contemporary fashion celebrating Iloilo''s weaving heritage — handcrafted hablon pieces and modern Filipino wear.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111109/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111109/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111109/gallery1.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111109/gallery2.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Clothing & Apparel' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111110',
    '00000000-0000-0000-0000-000000000001',
    'PageTurner Books',
    'Independent bookshop spotlighting Filipino literature, local authors, and premium stationery.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111110/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111110/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111110/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Bookstore / Stationery' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Serenity Spa Iloilo',
    'Full-service wellness sanctuary offering traditional hilot, Swedish massage, facials, and hot stone therapy.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111111/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111111/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111111/gallery1.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111111/gallery2.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Spa / Wellness Center' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111112',
    '00000000-0000-0000-0000-000000000001',
    'IronForge Fitness',
    'Modern gym with top-tier equipment, certified personal trainers, and lively group classes.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111112/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111112/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111112/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Fitness Studio / Gym' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111113',
    '00000000-0000-0000-0000-000000000001',
    'FixRight Repair Hub',
    'Trusted one-stop repair shop for smartphones, laptops, appliances, and clothing alterations.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111113/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111113/hero.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Repair Services' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111114',
    '00000000-0000-0000-0000-000000000001',
    'Casa Ilongga B&B',
    'Charming heritage guesthouse in the heart of Iloilo City offering warm Filipino hospitality and home-cooked breakfast.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111114/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111114/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111114/gallery1.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111114/gallery2.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Bed & Breakfast / Guesthouse' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111115',
    '00000000-0000-0000-0000-000000000001',
    'Ilonggo Craft Workshop',
    'Hands-on cultural classes in hablon weaving, native pottery, Dinagyang dance, and traditional Ilonggo cooking.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111115/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111115/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111115/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Cultural Experience Provider' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111116',
    '00000000-0000-0000-0000-000000000001',
    'The Lampara Live Music Bar',
    'Iloilo''s premier live-music venue — original bands, acoustic nights, craft cocktails, and private karaoke rooms.',
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111116/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111116/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111116/gallery1.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111116/gallery2.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Entertainment Venue' LIMIT 1)
  )
ON CONFLICT (id) DO NOTHING;

-- Branches for new businesses — all within 5 km of Iloilo City Plaza
INSERT INTO public.branches (id, business_id, name, address, location)
VALUES
  (
    '22222222-2222-2222-2222-222222222206',
    '11111111-1111-1111-1111-111111111106',
    'City Proper',
    'Calle Real, City Proper, Iloilo City',
    ST_MakePoint(122.5700, 10.6988)::geography   -- ~0.7 km
  ),
  (
    '22222222-2222-2222-2222-222222222207',
    '11111111-1111-1111-1111-111111111107',
    'La Paz',
    'Ledesma St., La Paz, Iloilo City',
    ST_MakePoint(122.5530, 10.7185)::geography   -- ~2.6 km
  ),
  (
    '22222222-2222-2222-2222-222222222208',
    '11111111-1111-1111-1111-111111111108',
    'Arevalo',
    'Real St., Arevalo, Iloilo City',
    ST_MakePoint(122.5250, 10.6810)::geography   -- ~4.1 km
  ),
  (
    '22222222-2222-2222-2222-222222222209',
    '11111111-1111-1111-1111-111111111109',
    'Jaro',
    'Delgado St., Jaro, Iloilo City',
    ST_MakePoint(122.5690, 10.7280)::geography   -- ~3.4 km
  ),
  (
    '22222222-2222-2222-2222-222222222210',
    '11111111-1111-1111-1111-111111111110',
    'Molo',
    'Avanceña St., Molo, Iloilo City',
    ST_MakePoint(122.5560, 10.6860)::geography   -- ~1.6 km
  ),
  (
    '22222222-2222-2222-2222-222222222211',
    '11111111-1111-1111-1111-111111111111',
    'Mandurriao',
    'Benigno Aquino Ave., Mandurriao, Iloilo City',
    ST_MakePoint(122.5470, 10.7130)::geography   -- ~2.8 km
  ),
  (
    '22222222-2222-2222-2222-222222222212',
    '11111111-1111-1111-1111-111111111112',
    'Mandurriao',
    'Gen. Luna St., Mandurriao, Iloilo City',
    ST_MakePoint(122.5450, 10.7150)::geography   -- ~3.0 km
  ),
  (
    '22222222-2222-2222-2222-222222222213',
    '11111111-1111-1111-1111-111111111113',
    'City Proper',
    'Iznart St., City Proper, Iloilo City',
    ST_MakePoint(122.5720, 10.6965)::geography   -- ~0.8 km
  ),
  (
    '22222222-2222-2222-2222-222222222214',
    '11111111-1111-1111-1111-111111111114',
    'City Proper',
    'Aldeguer St., City Proper, Iloilo City',
    ST_MakePoint(122.5665, 10.6930)::geography   -- ~0.5 km
  ),
  (
    '22222222-2222-2222-2222-222222222215',
    '11111111-1111-1111-1111-111111111115',
    'Jaro',
    'Baluarte Rd., Jaro, Iloilo City',
    ST_MakePoint(122.5645, 10.7310)::geography   -- ~3.8 km
  ),
  (
    '22222222-2222-2222-2222-222222222216',
    '11111111-1111-1111-1111-111111111116',
    'City Proper',
    'Gen. Luna St., City Proper, Iloilo City',
    ST_MakePoint(122.5680, 10.6998)::geography   -- ~0.5 km
  )
ON CONFLICT (id) DO NOTHING;

SET session_replication_role = DEFAULT;
