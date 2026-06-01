-- Dev seed: 21 verified businesses spread across Iloilo City + neighbouring provinces.
-- Matches the business-registration data shape so it can drive mobile map / directions:
--   * businesses.location  → jsonb { province, city, barangay, street_address, zip_code,
--                                    latitude, longitude, geometry:"lat:<lat>,lng:<lng>" }
--                            (exactly what app/business/registration writes — see
--                             lib/api/business/business.ts + steps/ShopInformation.tsx)
--   * branches.location    → PostGIS GEOGRAPHY POINT(lng lat), the column the
--                            nearby_businesses() RPC joins on for distance/directions.
-- INVARIANT: per business the same coordinate appears 3× — location.latitude/longitude,
-- the location.geometry string, and the branch ST_MakePoint(lng, lat). Keep all three in
-- sync when editing a pin (geometry is a registration-format mirror, not derived at runtime).
-- Coordinates are real-world points across Iloilo City districts, Iloilo province towns,
-- and neighbouring provinces (Guimaras, Antique, Capiz, Aklan, Negros Occidental), so the
-- mobile app can test directions over short to long-haul/inter-island distances
-- (City Proper ↔ Miagao ≈ 35 km; Iloilo City ↔ Kalibo/Aklan ≈ 160 km).
-- Pass a wide radius (e.g. radius=300000) to /api/mobile/businesses/nearby to see them all.
--
-- Run as service role. session_replication_role bypasses auth.users FK for the seed owner.
-- Storage URL base: http://127.0.0.1:54321/storage/v1/object/public

SET session_replication_role = replica;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'seedowner@ilokal.dev', 'Seed Owner', 'business_owner')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.businesses (id, owner_id, shop_name, description, location, logo_url, interior_images, status, category_id)
VALUES
  (
    '11111111-1111-1111-1111-111111111101',
    '00000000-0000-0000-0000-000000000001',
    'The Artisan Roastery',
    'Specialty coffee roasted in-house daily using single-origin beans from Benguet and Sagada.',
    '{"province":"Iloilo","city":"Iloilo City","barangay":"Kauswagan","street_address":"Iznart St.","zip_code":"5000","latitude":10.6969,"longitude":122.5732,"geometry":"lat:10.6969,lng:122.5732"}'::jsonb,
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
    '{"province":"Iloilo","city":"Iloilo City","barangay":"Tabuc Suba, Jaro","street_address":"Rizal St.","zip_code":"5000","latitude":10.7300,"longitude":122.5660,"geometry":"lat:10.73,lng:122.566"}'::jsonb,
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
    '{"province":"Iloilo","city":"Iloilo City","barangay":"San Rafael, Mandurriao","street_address":"Benigno Aquino Ave.","zip_code":"5000","latitude":10.7150,"longitude":122.5450,"geometry":"lat:10.715,lng:122.545"}'::jsonb,
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
    '{"province":"Iloilo","city":"Iloilo City","barangay":"San Antonio, Molo","street_address":"Yulo St.","zip_code":"5000","latitude":10.6847,"longitude":122.5572,"geometry":"lat:10.6847,lng:122.5572"}'::jsonb,
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
    '{"province":"Iloilo","city":"Iloilo City","barangay":"Burgos-Mabini-Plaza, La Paz","street_address":"Jalandoni St.","zip_code":"5000","latitude":10.7200,"longitude":122.5566,"geometry":"lat:10.72,lng:122.5566"}'::jsonb,
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111105/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111105/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111105/gallery1.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111105/gallery2.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Restaurant' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111106',
    '00000000-0000-0000-0000-000000000001',
    'El Tapas & Brew',
    'Craft beer taproom with rotating local brews and Spanish-inspired pulutan to share.',
    '{"province":"Iloilo","city":"Oton","barangay":"Poblacion South","street_address":"Real St.","zip_code":"5020","latitude":10.6931,"longitude":122.4736,"geometry":"lat:10.6931,lng:122.4736"}'::jsonb,
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
    '{"province":"Iloilo","city":"Pavia","barangay":"Ungka II","street_address":"Pavia–Sta. Barbara Rd.","zip_code":"5001","latitude":10.7757,"longitude":122.5446,"geometry":"lat:10.7757,lng:122.5446"}'::jsonb,
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
    '{"province":"Iloilo","city":"Santa Barbara","barangay":"Cubay","street_address":"Plaza St.","zip_code":"5002","latitude":10.8211,"longitude":122.5347,"geometry":"lat:10.8211,lng:122.5347"}'::jsonb,
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
    '{"province":"Iloilo","city":"Leganes","barangay":"Poblacion","street_address":"Rizal St.","zip_code":"5003","latitude":10.7836,"longitude":122.5872,"geometry":"lat:10.7836,lng:122.5872"}'::jsonb,
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
    '{"province":"Iloilo","city":"San Miguel","barangay":"Poblacion","street_address":"Bonifacio St.","zip_code":"5025","latitude":10.7794,"longitude":122.4744,"geometry":"lat:10.7794,lng:122.4744"}'::jsonb,
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
    '{"province":"Iloilo","city":"Cabatuan","barangay":"Poblacion","street_address":"Simon Ledesma St.","zip_code":"5031","latitude":10.8801,"longitude":122.4906,"geometry":"lat:10.8801,lng:122.4906"}'::jsonb,
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
    '{"province":"Iloilo","city":"Tigbauan","barangay":"Poblacion (Senror)","street_address":"Tigbauan–Guimbal Rd.","zip_code":"5021","latitude":10.6772,"longitude":122.3756,"geometry":"lat:10.6772,lng:122.3756"}'::jsonb,
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
    '{"province":"Iloilo","city":"Guimbal","barangay":"Poblacion","street_address":"Del Pilar St.","zip_code":"5022","latitude":10.6646,"longitude":122.3197,"geometry":"lat:10.6646,lng:122.3197"}'::jsonb,
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
    'Charming heritage guesthouse in the heart of Iloilo offering warm Filipino hospitality and home-cooked breakfast.',
    '{"province":"Iloilo","city":"Miagao","barangay":"Poblacion (Ubos Ilawod)","street_address":"Noble St.","zip_code":"5023","latitude":10.6433,"longitude":122.2351,"geometry":"lat:10.6433,lng:122.2351"}'::jsonb,
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
    '{"province":"Iloilo","city":"Dumangas","barangay":"Lopez Jaena - Burgos (Poblacion)","street_address":"Burgos St.","zip_code":"5006","latitude":10.8281,"longitude":122.7081,"geometry":"lat:10.8281,lng:122.7081"}'::jsonb,
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
    '{"province":"Iloilo","city":"Pototan","barangay":"Poblacion","street_address":"Mabini St.","zip_code":"5008","latitude":10.9519,"longitude":122.6361,"geometry":"lat:10.9519,lng:122.6361"}'::jsonb,
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111116/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111116/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111116/gallery1.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111116/gallery2.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Entertainment Venue' LIMIT 1)
  )
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  location    = EXCLUDED.location;

-- One branch per business. branches.location is PostGIS GEOGRAPHY and POINT order is (lng, lat).
-- lng/lat here mirror each business's location.geometry so the JSON address and the map pin agree.
-- The formatted address matches what registration builds: "<street>, <barangay>, <city>, <province>, <zip>".
INSERT INTO public.branches (id, business_id, name, address, location)
VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'City Proper',
    'Iznart St., Kauswagan, Iloilo City, Iloilo, 5000',
    ST_MakePoint(122.5732, 10.6969)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111102',
    'Jaro',
    'Rizal St., Tabuc Suba Jaro, Iloilo City, Iloilo, 5000',
    ST_MakePoint(122.5660, 10.7300)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    'Mandurriao',
    'Benigno Aquino Ave., San Rafael Mandurriao, Iloilo City, Iloilo, 5000',
    ST_MakePoint(122.5450, 10.7150)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111104',
    'Molo',
    'Yulo St., San Antonio Molo, Iloilo City, Iloilo, 5000',
    ST_MakePoint(122.5572, 10.6847)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111105',
    'La Paz',
    'Jalandoni St., Burgos-Mabini-Plaza La Paz, Iloilo City, Iloilo, 5000',
    ST_MakePoint(122.5566, 10.7200)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222206',
    '11111111-1111-1111-1111-111111111106',
    'Oton',
    'Real St., Poblacion South, Oton, Iloilo, 5020',
    ST_MakePoint(122.4736, 10.6931)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222207',
    '11111111-1111-1111-1111-111111111107',
    'Pavia',
    'Pavia–Sta. Barbara Rd., Ungka II, Pavia, Iloilo, 5001',
    ST_MakePoint(122.5446, 10.7757)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222208',
    '11111111-1111-1111-1111-111111111108',
    'Santa Barbara',
    'Plaza St., Cubay, Santa Barbara, Iloilo, 5002',
    ST_MakePoint(122.5347, 10.8211)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222209',
    '11111111-1111-1111-1111-111111111109',
    'Leganes',
    'Rizal St., Poblacion, Leganes, Iloilo, 5003',
    ST_MakePoint(122.5872, 10.7836)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222210',
    '11111111-1111-1111-1111-111111111110',
    'San Miguel',
    'Bonifacio St., Poblacion, San Miguel, Iloilo, 5025',
    ST_MakePoint(122.4744, 10.7794)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222211',
    '11111111-1111-1111-1111-111111111111',
    'Cabatuan',
    'Simon Ledesma St., Poblacion, Cabatuan, Iloilo, 5031',
    ST_MakePoint(122.4906, 10.8801)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222212',
    '11111111-1111-1111-1111-111111111112',
    'Tigbauan',
    'Tigbauan–Guimbal Rd., Poblacion, Tigbauan, Iloilo, 5021',
    ST_MakePoint(122.3756, 10.6772)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222213',
    '11111111-1111-1111-1111-111111111113',
    'Guimbal',
    'Del Pilar St., Poblacion, Guimbal, Iloilo, 5022',
    ST_MakePoint(122.3197, 10.6646)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222214',
    '11111111-1111-1111-1111-111111111114',
    'Miagao',
    'Noble St., Poblacion (Ubos Ilawod), Miagao, Iloilo, 5023',
    ST_MakePoint(122.2351, 10.6433)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222215',
    '11111111-1111-1111-1111-111111111115',
    'Dumangas',
    'Burgos St., Lopez Jaena - Burgos, Dumangas, Iloilo, 5006',
    ST_MakePoint(122.7081, 10.8281)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222216',
    '11111111-1111-1111-1111-111111111116',
    'Pototan',
    'Mabini St., Poblacion, Pototan, Iloilo, 5008',
    ST_MakePoint(122.6361, 10.9519)::geography
  )
ON CONFLICT (id) DO UPDATE SET
  name     = EXCLUDED.name,
  address  = EXCLUDED.address,
  location = EXCLUDED.location;

-- ── Cross-province businesses: neighbouring provinces for long-haul / inter-island routes ──
-- Guimaras & Negros sit across water from Panay, so directions exercise ferry-distance legs.
INSERT INTO public.businesses (id, owner_id, shop_name, description, location, logo_url, interior_images, status, category_id)
VALUES
  (
    '11111111-1111-1111-1111-111111111117',
    '00000000-0000-0000-0000-000000000001',
    'Pitstop Mango Café',
    'Island café famous for Guimaras sweet-mango pizza, mango shakes, and slow brunches by the wharf.',
    '{"province":"Guimaras","city":"Jordan","barangay":"Rizal","street_address":"San Miguel St.","zip_code":"5045","latitude":10.6585,"longitude":122.5921,"geometry":"lat:10.6585,lng:122.5921"}'::jsonb,
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111117/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111117/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111117/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Café' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111118',
    '00000000-0000-0000-0000-000000000001',
    'Antique Seafood Grill',
    'Fresh-off-the-boat grilled seafood and Antiqueño specialties along the Sulu Sea coast.',
    '{"province":"Antique","city":"San Jose de Buenavista","barangay":"Atabay","street_address":"T.A. Fornier St.","zip_code":"5700","latitude":10.7402,"longitude":121.9398,"geometry":"lat:10.7402,lng:121.9398"}'::jsonb,
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111118/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111118/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111118/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Restaurant' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111119',
    '00000000-0000-0000-0000-000000000001',
    'Roxas Bay Brews',
    'Seafood-capital taproom pouring local craft beer with fresh oysters and diwal clams.',
    '{"province":"Capiz","city":"Roxas City","barangay":"Baybay","street_address":"Roxas Ave.","zip_code":"5800","latitude":11.5853,"longitude":122.7511,"geometry":"lat:11.5853,lng:122.7511"}'::jsonb,
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111119/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111119/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111119/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Bar / Pub' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111120',
    '00000000-0000-0000-0000-000000000001',
    'Kalibo Heritage Bakeshop',
    'Aklanon bakeshop for fresh pan de sila, inumol, and Ati-Atihan festival pastries.',
    '{"province":"Aklan","city":"Kalibo","barangay":"Poblacion","street_address":"Martyrs St.","zip_code":"5600","latitude":11.7086,"longitude":122.3654,"geometry":"lat:11.7086,lng:122.3654"}'::jsonb,
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111120/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111120/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111120/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Bakery / Pastry Shop' LIMIT 1)
  ),
  (
    '11111111-1111-1111-1111-111111111121',
    '00000000-0000-0000-0000-000000000001',
    'Bacolod Wellness Retreat',
    'City-of-Smiles wellness spa offering traditional hilot, aromatherapy, and hot-stone massage.',
    '{"province":"Negros Occidental","city":"Bacolod City","barangay":"Mandalagan","street_address":"Lacson St.","zip_code":"6100","latitude":10.6765,"longitude":122.9509,"geometry":"lat:10.6765,lng:122.9509"}'::jsonb,
    'http://127.0.0.1:54321/storage/v1/object/public/shop-logos/11111111-1111-1111-1111-111111111121/logo.jpg',
    ARRAY[
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111121/hero.jpg',
      'http://127.0.0.1:54321/storage/v1/object/public/interior-images/11111111-1111-1111-1111-111111111121/gallery1.jpg'
    ],
    'verified',
    (SELECT id FROM public.business_categories WHERE name = 'Spa / Wellness Center' LIMIT 1)
  )
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  location    = EXCLUDED.location;

INSERT INTO public.branches (id, business_id, name, address, location)
VALUES
  (
    '22222222-2222-2222-2222-222222222217',
    '11111111-1111-1111-1111-111111111117',
    'Jordan',
    'San Miguel St., Rizal, Jordan, Guimaras, 5045',
    ST_MakePoint(122.5921, 10.6585)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222218',
    '11111111-1111-1111-1111-111111111118',
    'San Jose de Buenavista',
    'T.A. Fornier St., Atabay, San Jose de Buenavista, Antique, 5700',
    ST_MakePoint(121.9398, 10.7402)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222219',
    '11111111-1111-1111-1111-111111111119',
    'Roxas City',
    'Roxas Ave., Baybay, Roxas City, Capiz, 5800',
    ST_MakePoint(122.7511, 11.5853)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222220',
    '11111111-1111-1111-1111-111111111120',
    'Kalibo',
    'Martyrs St., Poblacion, Kalibo, Aklan, 5600',
    ST_MakePoint(122.3654, 11.7086)::geography
  ),
  (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111121',
    'Bacolod City',
    'Lacson St., Mandalagan, Bacolod City, Negros Occidental, 6100',
    ST_MakePoint(122.9509, 10.6765)::geography
  )
ON CONFLICT (id) DO UPDATE SET
  name     = EXCLUDED.name,
  address  = EXCLUDED.address,
  location = EXCLUDED.location;

SET session_replication_role = DEFAULT;
