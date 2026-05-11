-- Dev seed: coupons for all 5 seed businesses
-- Depends on: businesses.sql

INSERT INTO public.coupons (id, business_id, title, description, type, start_date, end_date, redeem_time_limit_minutes)
VALUES
  -- The Artisan Roastery
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111101',
    '20% Off Any Coffee', 'Valid on all espresso and filter drinks.', 'discount',
    NOW(), NOW() + INTERVAL '30 days', 30),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111101',
    'Buy 1 Get 1 Cold Brew', 'Get a second Cold Brew free when you buy one.', 'deal',
    NOW(), NOW() + INTERVAL '14 days', 20),

  -- Flora & Flour Bakery
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111102',
    'Free Ube Pandesal (×2)', 'Get 2 Ube Pandesal free with any purchase over ₱150.', 'deal',
    NOW(), NOW() + INTERVAL '7 days', 15),
  ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111102',
    '10% Off Whole Cakes', 'Applies to Sans Rival and special-order cakes.', 'discount',
    NOW(), NOW() + INTERVAL '30 days', 45),

  -- The Handy Corner
  ('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111103',
    '₱100 Off Power Tools', 'Valid on any power tool purchase over ₱1,000.', 'voucher',
    NOW(), NOW() + INTERVAL '30 days', 60),
  ('44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111103',
    '15% Off Paint & Supplies', 'Includes rollers, trays, brushes, and paint.', 'discount',
    NOW(), NOW() + INTERVAL '21 days', 30),

  -- Aura Hair Studio
  ('44444444-4444-4444-4444-444444444407', '11111111-1111-1111-1111-111111111104',
    'Free Blowout with Haircut', 'Book any haircut service and get a blowout free.', 'deal',
    NOW(), NOW() + INTERVAL '14 days', 90),
  ('44444444-4444-4444-4444-444444444408', '11111111-1111-1111-1111-111111111104',
    '₱500 Off Hair Color', 'Valid on full hair color (shoulder length and above).', 'voucher',
    NOW(), NOW() + INTERVAL '30 days', 120),

  -- Luna & Leaf Bistro
  ('44444444-4444-4444-4444-444444444409', '11111111-1111-1111-1111-111111111105',
    'Free Smoothie with Any Bowl', 'Order any grain or acai bowl and get a smoothie free.', 'deal',
    NOW(), NOW() + INTERVAL '10 days', 20),
  ('44444444-4444-4444-4444-444444444410', '11111111-1111-1111-1111-111111111105',
    '15% Off First Order', 'For first-time dine-in customers only.', 'discount',
    NOW(), NOW() + INTERVAL '60 days', 30)
ON CONFLICT (id) DO NOTHING;
