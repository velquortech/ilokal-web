-- Dev seed: 5 verified businesses near Manila Bay (lat 14.5995, lng 120.9842)
-- Run as service role. session_replication_role bypasses auth.users FK for the seed owner.

SET session_replication_role = replica;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'seedowner@ilokal.dev', 'Seed Owner', 'business_owner')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.businesses (id, owner_id, name, description, logo_url, interior_images, status)
VALUES
  (
    '11111111-1111-1111-1111-111111111101',
    '00000000-0000-0000-0000-000000000001',
    'The Artisan Roastery',
    'Specialty coffee roasted in-house daily using single-origin beans from Benguet and Sagada.',
    'https://picsum.photos/seed/artisancafe/400/400',
    ARRAY[
      'https://picsum.photos/seed/artisancafe-hero/800/500',
      'https://picsum.photos/seed/artisan-g1/800/520',
      'https://picsum.photos/seed/artisan-g2/800/520'
    ],
    'verified'
  ),
  (
    '11111111-1111-1111-1111-111111111102',
    '00000000-0000-0000-0000-000000000001',
    'Flora & Flour Bakery',
    'Artisanal Filipino breads and pastries baked fresh every morning.',
    'https://picsum.photos/seed/florabakery/400/400',
    ARRAY[
      'https://picsum.photos/seed/florabakery-hero/800/500',
      'https://picsum.photos/seed/flora-g1/800/520'
    ],
    'verified'
  ),
  (
    '11111111-1111-1111-1111-111111111103',
    '00000000-0000-0000-0000-000000000001',
    'The Handy Corner',
    'Your trusted neighborhood hardware and home improvement store.',
    'https://picsum.photos/seed/handystore/400/400',
    ARRAY[
      'https://picsum.photos/seed/handystore-hero/800/500'
    ],
    'verified'
  ),
  (
    '11111111-1111-1111-1111-111111111104',
    '00000000-0000-0000-0000-000000000001',
    'Aura Hair Studio',
    'Premium hair styling, coloring, and treatments by certified and experienced stylists.',
    'https://picsum.photos/seed/aurasalon/400/400',
    ARRAY[
      'https://picsum.photos/seed/aurasalon-hero/800/500',
      'https://picsum.photos/seed/aura-g1/800/520',
      'https://picsum.photos/seed/aura-g2/800/520'
    ],
    'verified'
  ),
  (
    '11111111-1111-1111-1111-111111111105',
    '00000000-0000-0000-0000-000000000001',
    'Luna & Leaf Bistro',
    'Farm-to-table bistro serving organic coffee and healthy Filipino-inspired bowls.',
    'https://picsum.photos/seed/lunaleaf/400/400',
    ARRAY[
      'https://picsum.photos/seed/lunaleaf-hero/800/500',
      'https://picsum.photos/seed/luna-g1/800/520',
      'https://picsum.photos/seed/luna-g2/800/520'
    ],
    'verified'
  )
ON CONFLICT (id) DO NOTHING;

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
