-- Dev seed: products for all 5 seed businesses
-- Depends on: businesses.sql

INSERT INTO public.products (id, business_id, name, description, price, image_url, is_available)
VALUES
  -- The Artisan Roastery
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 'Flat White',       'Smooth double ristretto with steamed milk',                  145, 'https://picsum.photos/seed/flatwhite/400/400',    true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111101', 'Pour Over',        'Single-origin Benguet beans, brewed to order',               165, 'https://picsum.photos/seed/pourover/400/400',     true),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111101', 'Cold Brew',        '18-hour cold-steeped concentrate over ice',                  185, 'https://picsum.photos/seed/coldbrew/400/400',     true),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111101', 'Butter Croissant', 'Laminated dough, baked fresh every morning',                  95, 'https://picsum.photos/seed/croissant/400/400',    true),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111101', 'Avocado Toast',    'Sourdough, smashed avocado, chili flakes, poached egg',       220, 'https://picsum.photos/seed/avotoast/400/400',     true),

  -- Flora & Flour Bakery
  ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111102', 'Ube Pandesal',     'Soft Filipino rolls with ube halaya filling',                  18, 'https://picsum.photos/seed/ubepandesal/400/400',  true),
  ('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111102', 'Ensaymada',        'Fluffy brioche topped with buttercream and cheese',            55, 'https://picsum.photos/seed/ensaymada/400/400',    true),
  ('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111102', 'Sans Rival',       'Classic Filipino cashew-meringue buttercream cake (slice)',   120, 'https://picsum.photos/seed/sansrival/400/400',    true),
  ('33333333-3333-3333-3333-333333333309', '11111111-1111-1111-1111-111111111102', 'Spanish Bread',    'Soft roll filled with butter and breadcrumb mixture',          22, 'https://picsum.photos/seed/spanishbread/400/400', true),
  ('33333333-3333-3333-3333-333333333310', '11111111-1111-1111-1111-111111111102', 'Buko Pie',         'Flaky crust filled with young coconut and custard',           155, 'https://picsum.photos/seed/bukopie/400/400',      true),

  -- The Handy Corner
  ('33333333-3333-3333-3333-333333333311', '11111111-1111-1111-1111-111111111103', 'Claw Hammer',      '16 oz steel claw hammer with fiberglass handle',             295, 'https://picsum.photos/seed/hammer/400/400',       true),
  ('33333333-3333-3333-3333-333333333312', '11111111-1111-1111-1111-111111111103', 'Power Drill',      '18V cordless drill/driver with 2 batteries',                1850, 'https://picsum.photos/seed/drill/400/400',        true),
  ('33333333-3333-3333-3333-333333333313', '11111111-1111-1111-1111-111111111103', 'Paint Roller Set', '9-inch roller with tray and 2 covers',                        185, 'https://picsum.photos/seed/paintroller/400/400',  true),
  ('33333333-3333-3333-3333-333333333314', '11111111-1111-1111-1111-111111111103', 'Measuring Tape',   '5m stainless blade, auto-lock',                                98, 'https://picsum.photos/seed/tape/400/400',         true),
  ('33333333-3333-3333-3333-333333333315', '11111111-1111-1111-1111-111111111103', 'Work Gloves',      'Cut-resistant nitrile-coated safety gloves',                   75, 'https://picsum.photos/seed/gloves/400/400',       true),

  -- Aura Hair Studio
  ('33333333-3333-3333-3333-333333333316', '11111111-1111-1111-1111-111111111104', 'Haircut (Men)',    'Precision cut with wash and blowdry',                         250, 'https://picsum.photos/seed/mencut/400/400',       true),
  ('33333333-3333-3333-3333-333333333317', '11111111-1111-1111-1111-111111111104', 'Haircut (Women)',  'Cut, wash, and style by senior stylist',                      450, 'https://picsum.photos/seed/womencut/400/400',     true),
  ('33333333-3333-3333-3333-333333333318', '11111111-1111-1111-1111-111111111104', 'Hair Color',       'Full color application with toner (shoulder length)',        1800, 'https://picsum.photos/seed/haircolor/400/400',    true),
  ('33333333-3333-3333-3333-333333333319', '11111111-1111-1111-1111-111111111104', 'Blowout',          'Wash, blowdry, and smooth style',                             350, 'https://picsum.photos/seed/blowout/400/400',      true),
  ('33333333-3333-3333-3333-333333333320', '11111111-1111-1111-1111-111111111104', 'Hair Treatment',   'Keratin mask and deep conditioning (30 min)',                 650, 'https://picsum.photos/seed/treatment/400/400',    true),

  -- Luna & Leaf Bistro
  ('33333333-3333-3333-3333-333333333321', '11111111-1111-1111-1111-111111111105', 'Acai Bowl',        'Frozen acai, granola, banana, chia seeds, honey drizzle',    285, 'https://picsum.photos/seed/acaibowl/400/400',     true),
  ('33333333-3333-3333-3333-333333333322', '11111111-1111-1111-1111-111111111105', 'Grain Bowl',       'Brown rice, roasted veggies, soft-boiled egg, tahini',        265, 'https://picsum.photos/seed/grainbowl/400/400',    true),
  ('33333333-3333-3333-3333-333333333323', '11111111-1111-1111-1111-111111111105', 'Green Smoothie',   'Spinach, cucumber, green apple, ginger, coconut water',       185, 'https://picsum.photos/seed/smoothie/400/400',     true),
  ('33333333-3333-3333-3333-333333333324', '11111111-1111-1111-1111-111111111105', 'Turmeric Latte',   'Oat milk, turmeric, ginger, black pepper, honey',             165, 'https://picsum.photos/seed/turmericlatte/400/400', true),
  ('33333333-3333-3333-3333-333333333325', '11111111-1111-1111-1111-111111111105', 'Buddha Bowl',      'Falafel, hummus, mixed greens, pickled veg, pita',            295, 'https://picsum.photos/seed/buddhabowl/400/400',   true)
ON CONFLICT (id) DO NOTHING;
