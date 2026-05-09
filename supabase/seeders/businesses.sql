-- Dev seed: 5 verified businesses near Manila Bay (lat 14.5995, lng 120.9842)
-- Run as service role. session_replication_role bypasses auth.users FK for the seed owner.

SET session_replication_role = replica;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'seedowner@ilokal.dev', 'Seed Owner', 'business_owner')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.businesses (id, owner_id, shop_name, description, logo_url, interior_images, status)
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

-- Products
INSERT INTO public.products (id, business_id, name, description, price, image_url, is_available)
VALUES
  -- The Artisan Roastery
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 'Single Origin Pour Over', 'Ethiopian Yirgacheffe, floral and citrus notes', 220.00, 'https://picsum.photos/seed/pourover/200/200', true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111101', 'Flat White', 'Double ristretto with silky microfoam', 185.00, 'https://picsum.photos/seed/flatwhite/200/200', true),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111101', 'Cold Brew', 'Slow-steeped 18 hours, served over ice', 160.00, 'https://picsum.photos/seed/coldbrew/200/200', true),
  -- Flora & Flour Bakery
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111102', 'Ube Cream Cheese Pandesal', 'Soft rolls filled with ube halaya and cream cheese', 65.00, 'https://picsum.photos/seed/pandesal/200/200', true),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111102', 'Ensaymada', 'Brioche topped with butter, sugar, and queso', 85.00, 'https://picsum.photos/seed/ensaymada/200/200', true),
  ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111102', 'Leche Flan Tart', 'Crisp pastry shell with silky Filipino custard', 120.00, 'https://picsum.photos/seed/flan/200/200', true),
  -- The Handy Corner
  ('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111103', 'LED Bulb Pack (6pcs)', 'Energy-saving 9W daylight bulbs', 299.00, 'https://picsum.photos/seed/bulbs/200/200', true),
  ('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111103', 'Heavy Duty Extension Cord', '3-outlet, 5 meter, with surge protection', 450.00, 'https://picsum.photos/seed/extension/200/200', true),
  -- Aura Hair Studio
  ('33333333-3333-3333-3333-333333333309', '11111111-1111-1111-1111-111111111104', 'Haircut & Blowdry', 'Precision cut and professional blowout', 450.00, 'https://picsum.photos/seed/haircut/200/200', true),
  ('33333333-3333-3333-3333-333333333310', '11111111-1111-1111-1111-111111111104', 'Hair Color (Full)', 'Global color with toning treatment included', 1800.00, 'https://picsum.photos/seed/haircolor/200/200', true),
  ('33333333-3333-3333-3333-333333333311', '11111111-1111-1111-1111-111111111104', 'Keratin Treatment', 'Smoothing treatment, results last 3–4 months', 3500.00, 'https://picsum.photos/seed/keratin/200/200', true),
  -- Luna & Leaf Bistro
  ('33333333-3333-3333-3333-333333333312', '11111111-1111-1111-1111-111111111105', 'Signature Latte', 'Oat milk, honey, and cinnamon', 380.00, 'https://picsum.photos/seed/signaturelatte/200/200', true),
  ('33333333-3333-3333-3333-333333333313', '11111111-1111-1111-1111-111111111105', 'Avocado Zen Bowl', 'Fresh greens, seeds, and lemon vinaigrette', 820.00, 'https://picsum.photos/seed/zenbowl/200/200', true),
  ('33333333-3333-3333-3333-333333333314', '11111111-1111-1111-1111-111111111105', 'Matcha Affogato', 'Ceremonial matcha poured over vanilla ice cream', 320.00, 'https://picsum.photos/seed/matcha/200/200', true)
ON CONFLICT (id) DO NOTHING;

-- Coupons (end dates in 2026 so they stay active)
INSERT INTO public.coupons (id, business_id, title, description, type, start_date, end_date, redeem_time_limit_minutes)
VALUES
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111101', 'Morning Brew Deal', 'Buy any pour over, get a pastry 50% off before 10am', 'deal', '2026-01-01', '2026-12-31', 15),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111101', '10% Off Your 3rd Visit', 'Loyalty discount — show this on your third order', 'discount', '2026-01-01', '2026-12-31', 10),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111102', 'Free Pandesal with Any Order', 'Get one Ube Pandesal free with any purchase over ₱200', 'voucher', '2026-01-01', '2026-12-31', 20),
  ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111104', '₱200 Off Keratin Treatment', 'Valid on full keratin service, weekdays only', 'discount', '2026-01-01', '2026-09-30', 30),
  ('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111105', 'Zen Bowl + Latte Combo', 'Get the Avocado Zen Bowl and Signature Latte for ₱1,050', 'deal', '2026-01-01', '2026-12-31', 15)
ON CONFLICT (id) DO NOTHING;

SET session_replication_role = DEFAULT;
