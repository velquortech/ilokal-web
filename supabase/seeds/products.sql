-- Dev seed: products for all 5 seed businesses
-- Depends on: businesses.sql

INSERT INTO public.products (id, business_id, name, description, price, image_url, is_available)
VALUES
  -- The Artisan Roastery
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 'Flat White',       'Smooth double ristretto with steamed milk',                  145, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333301/product.jpg', true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111101', 'Pour Over',        'Single-origin Benguet beans, brewed to order',               165, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333302/product.jpg', true),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111101', 'Cold Brew',        '18-hour cold-steeped concentrate over ice',                  185, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333303/product.jpg', true),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111101', 'Butter Croissant', 'Laminated dough, baked fresh every morning',                  95, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333304/product.jpg', true),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111101', 'Avocado Toast',    'Sourdough, smashed avocado, chili flakes, poached egg',       220, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333305/product.jpg', true),

  -- Flora & Flour Bakery
  ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111102', 'Ube Pandesal',     'Soft Filipino rolls with ube halaya filling',                  18, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333306/product.jpg', true),
  ('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111102', 'Ensaymada',        'Fluffy brioche topped with buttercream and cheese',            55, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333307/product.jpg', true),
  ('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111102', 'Sans Rival',       'Classic Filipino cashew-meringue buttercream cake (slice)',   120, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333308/product.jpg', true),
  ('33333333-3333-3333-3333-333333333309', '11111111-1111-1111-1111-111111111102', 'Spanish Bread',    'Soft roll filled with butter and breadcrumb mixture',          22, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333309/product.jpg', true),
  ('33333333-3333-3333-3333-333333333310', '11111111-1111-1111-1111-111111111102', 'Buko Pie',         'Flaky crust filled with young coconut and custard',           155, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333310/product.jpg', true),

  -- The Handy Corner
  ('33333333-3333-3333-3333-333333333311', '11111111-1111-1111-1111-111111111103', 'Claw Hammer',      '16 oz steel claw hammer with fiberglass handle',             295, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333311/product.jpg', true),
  ('33333333-3333-3333-3333-333333333312', '11111111-1111-1111-1111-111111111103', 'Power Drill',      '18V cordless drill/driver with 2 batteries',                1850, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333312/product.jpg', true),
  ('33333333-3333-3333-3333-333333333313', '11111111-1111-1111-1111-111111111103', 'Paint Roller Set', '9-inch roller with tray and 2 covers',                        185, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333313/product.jpg', true),
  ('33333333-3333-3333-3333-333333333314', '11111111-1111-1111-1111-111111111103', 'Measuring Tape',   '5m stainless blade, auto-lock',                                98, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333314/product.jpg', true),
  ('33333333-3333-3333-3333-333333333315', '11111111-1111-1111-1111-111111111103', 'Work Gloves',      'Cut-resistant nitrile-coated safety gloves',                   75, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333315/product.jpg', true),

  -- Aura Hair Studio
  ('33333333-3333-3333-3333-333333333316', '11111111-1111-1111-1111-111111111104', 'Haircut (Men)',    'Precision cut with wash and blowdry',                         250, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333316/product.jpg', true),
  ('33333333-3333-3333-3333-333333333317', '11111111-1111-1111-1111-111111111104', 'Haircut (Women)',  'Cut, wash, and style by senior stylist',                      450, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333317/product.jpg', true),
  ('33333333-3333-3333-3333-333333333318', '11111111-1111-1111-1111-111111111104', 'Hair Color',       'Full color application with toner (shoulder length)',        1800, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333318/product.jpg', true),
  ('33333333-3333-3333-3333-333333333319', '11111111-1111-1111-1111-111111111104', 'Blowout',          'Wash, blowdry, and smooth style',                             350, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333319/product.jpg', true),
  ('33333333-3333-3333-3333-333333333320', '11111111-1111-1111-1111-111111111104', 'Hair Treatment',   'Keratin mask and deep conditioning (30 min)',                 650, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333320/product.jpg', true),

  -- Luna & Leaf Bistro
  ('33333333-3333-3333-3333-333333333321', '11111111-1111-1111-1111-111111111105', 'Acai Bowl',        'Frozen acai, granola, banana, chia seeds, honey drizzle',    285, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333321/product.jpg', true),
  ('33333333-3333-3333-3333-333333333322', '11111111-1111-1111-1111-111111111105', 'Grain Bowl',       'Brown rice, roasted veggies, soft-boiled egg, tahini',        265, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333322/product.jpg', true),
  ('33333333-3333-3333-3333-333333333323', '11111111-1111-1111-1111-111111111105', 'Green Smoothie',   'Spinach, cucumber, green apple, ginger, coconut water',       185, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333323/product.jpg', true),
  ('33333333-3333-3333-3333-333333333324', '11111111-1111-1111-1111-111111111105', 'Turmeric Latte',   'Oat milk, turmeric, ginger, black pepper, honey',             165, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333324/product.jpg', true),
  ('33333333-3333-3333-3333-333333333325', '11111111-1111-1111-1111-111111111105', 'Buddha Bowl',      'Falafel, hummus, mixed greens, pickled veg, pita',            295, 'http://127.0.0.1:54321/storage/v1/object/public/product-images/33333333-3333-3333-3333-333333333325/product.jpg', true)
ON CONFLICT (id) DO NOTHING;
