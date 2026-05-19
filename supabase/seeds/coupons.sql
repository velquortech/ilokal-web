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

-- Coupons for the 11 new businesses (IDs 411–432)
INSERT INTO public.coupons (id, business_id, title, description, type, start_date, end_date, redeem_time_limit_minutes)
VALUES
  -- El Tapas & Brew
  ('44444444-4444-4444-4444-444444444411', '11111111-1111-1111-1111-111111111106',
    'Happy Hour: 2-for-1 Craft Beers', 'Any two same craft beer pours at the price of one, weekdays 5–7 PM.', 'deal',
    NOW(), NOW() + INTERVAL '30 days', 30),
  ('44444444-4444-4444-4444-444444444412', '11111111-1111-1111-1111-111111111106',
    '₱50 Off Pulutan Platter', 'Valid on any Pulutan Platter order of ₱250 and above.', 'voucher',
    NOW(), NOW() + INTERVAL '21 days', 45),

  -- Iloilo Street Eats
  ('44444444-4444-4444-4444-444444444413', '11111111-1111-1111-1111-111111111107',
    'Buy 10 Isaw, Get 5 Free', 'Order 10 isaw skewers and receive 5 pieces free.', 'deal',
    NOW(), NOW() + INTERVAL '14 days', 15),
  ('44444444-4444-4444-4444-444444444414', '11111111-1111-1111-1111-111111111107',
    '15% Off All Orders Over ₱100', 'Discount applies to any combined street food order totaling ₱100+.', 'discount',
    NOW(), NOW() + INTERVAL '30 days', 20),

  -- Sari-Sari ni Nena
  ('44444444-4444-4444-4444-444444444415', '11111111-1111-1111-1111-111111111108',
    'Free 2 Eggs on Every Visit', 'Get 2 free eggs with any single purchase of ₱50 or more.', 'deal',
    NOW(), NOW() + INTERVAL '7 days', 10),
  ('44444444-4444-4444-4444-444444444416', '11111111-1111-1111-1111-111111111108',
    '₱20 Off Instant Noodles Bundle', 'Valid on the 12-pack instant noodles bundle only.', 'voucher',
    NOW(), NOW() + INTERVAL '30 days', 15),

  -- Hablon & Hue Boutique
  ('44444444-4444-4444-4444-444444444417', '11111111-1111-1111-1111-111111111109',
    '10% Off All Hablon Items', 'Applies to all handwoven hablon blouses, scarves, and accessories.', 'discount',
    NOW(), NOW() + INTERVAL '30 days', 60),
  ('44444444-4444-4444-4444-444444444418', '11111111-1111-1111-1111-111111111109',
    'Free Tote Bag with Any Dress Purchase', 'Receive a souvenir tote bag free when you buy any dress.', 'deal',
    NOW(), NOW() + INTERVAL '14 days', 45),

  -- PageTurner Books
  ('44444444-4444-4444-4444-444444444419', '11111111-1111-1111-1111-111111111110',
    '₱50 Off on Purchases Over ₱500', 'Stack your books and save — applies to any single transaction.', 'voucher',
    NOW(), NOW() + INTERVAL '30 days', 30),
  ('44444444-4444-4444-4444-444444444420', '11111111-1111-1111-1111-111111111110',
    'Free Bookmark Set with Any Book', 'Claim a curated local-art bookmark set free with every book purchase.', 'deal',
    NOW(), NOW() + INTERVAL '14 days', 20),

  -- Serenity Spa Iloilo
  ('44444444-4444-4444-4444-444444444421', '11111111-1111-1111-1111-111111111111',
    '20% Off First Massage Visit', 'For first-time clients only. Valid on Swedish or Hilot massage.', 'discount',
    NOW(), NOW() + INTERVAL '30 days', 90),
  ('44444444-4444-4444-4444-444444444422', '11111111-1111-1111-1111-111111111111',
    'Free Foot Scrub with Hot Stone Therapy', 'Add a complimentary foot scrub to any Hot Stone Therapy booking.', 'deal',
    NOW(), NOW() + INTERVAL '21 days', 120),

  -- IronForge Fitness
  ('44444444-4444-4444-4444-444444444423', '11111111-1111-1111-1111-111111111112',
    'First Month Membership at ₱500', 'New members only — first month billed at ₱500 instead of ₱800.', 'voucher',
    NOW(), NOW() + INTERVAL '30 days', 60),
  ('44444444-4444-4444-4444-444444444424', '11111111-1111-1111-1111-111111111112',
    'Free Group Class with Monthly Sign-Up', 'Choose one free Yoga or Zumba class when you sign up monthly.', 'deal',
    NOW(), NOW() + INTERVAL '14 days', 60),

  -- FixRight Repair Hub
  ('44444444-4444-4444-4444-444444444425', '11111111-1111-1111-1111-111111111113',
    '₱100 Off Any Phone Repair', 'Valid on screen replacements or battery swaps. One use per customer.', 'voucher',
    NOW(), NOW() + INTERVAL '30 days', 60),
  ('44444444-4444-4444-4444-444444444426', '11111111-1111-1111-1111-111111111113',
    'Free Diagnostics on Laptop Repair', 'Bring in any laptop for a free check-up before committing to repair.', 'deal',
    NOW(), NOW() + INTERVAL '21 days', 60),

  -- Casa Ilongga B&B
  ('44444444-4444-4444-4444-444444444427', '11111111-1111-1111-1111-111111111114',
    '15% Off Weekend Stay', 'Book a Friday–Sunday stay and save 15% on any room type.', 'discount',
    NOW(), NOW() + INTERVAL '30 days', 120),
  ('44444444-4444-4444-4444-444444444428', '11111111-1111-1111-1111-111111111114',
    'Free Breakfast for 2 on 3-Night Stay', 'Complimentary full breakfast for two guests on any 3-night booking.', 'deal',
    NOW(), NOW() + INTERVAL '30 days', 180),

  -- Ilonggo Craft Workshop
  ('44444444-4444-4444-4444-444444444429', '11111111-1111-1111-1111-111111111115',
    '2-for-1 Weaving Class', 'Bring a friend to the Hablon Weaving Class and both pay for one slot.', 'deal',
    NOW(), NOW() + INTERVAL '14 days', 180),
  ('44444444-4444-4444-4444-444444444430', '11111111-1111-1111-1111-111111111115',
    '₱100 Off Any Workshop Booking', 'Valid on any single workshop (weaving, pottery, dance, or cooking).', 'voucher',
    NOW(), NOW() + INTERVAL '30 days', 120),

  -- The Lampara Live Music Bar
  ('44444444-4444-4444-4444-444444444431', '11111111-1111-1111-1111-111111111116',
    'Free Entry on Weeknight Show', 'Complimentary entry for Monday–Thursday live music nights.', 'deal',
    NOW(), NOW() + INTERVAL '14 days', 60),
  ('44444444-4444-4444-4444-444444444432', '11111111-1111-1111-1111-111111111116',
    '10% Off Private Booth Reservation', 'Valid on any Private Booth booking for 4 or more guests.', 'discount',
    NOW(), NOW() + INTERVAL '30 days', 120)
ON CONFLICT (id) DO NOTHING;
