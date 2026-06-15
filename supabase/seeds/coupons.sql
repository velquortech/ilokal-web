-- Dev seed: coupons for all seed businesses
-- Depends on: businesses.sql
-- Schema: normalized (migration 20260523000000) — uses code, discount JSONB, expiry_date
-- promotion_type: 'coupon' (code-based) | 'deal' (featured deal, no code needed)
-- All rows are published so the mobile API (status = 'published' filter) returns them.

INSERT INTO public.coupons (id, business_id, code, description, discount, start_date, expiry_date, status, promotion_type)
VALUES
  -- The Artisan Roastery
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111101',
    'COFFEE20', '20% off all espresso and filter drinks.',
    '{"type":"percentage","value":20}', NOW(), NOW() + INTERVAL '30 days', 'published', 'coupon'),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111101',
    'BOGO-COLDBREW', 'Buy one Cold Brew, get the second free all weekend.',
    '{"type":"percentage","value":50}', NOW(), NOW() + INTERVAL '3 days', 'published', 'deal'),

  -- Flora & Flour Bakery
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111102',
    'FREE-PANDESAL', 'Get 2 Ube Pandesal free with any purchase over ₱150.',
    '{"type":"fixed_amount","value":40}', NOW(), NOW() + INTERVAL '7 days', 'published', 'coupon'),
  ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111102',
    'CAKE10', '10% off Sans Rival and special-order cakes this month.',
    '{"type":"percentage","value":10}', NOW(), NOW() + INTERVAL '30 days', 'published', 'deal'),

  -- The Handy Corner
  ('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111103',
    'TOOLS100', '₱100 off any power tool purchase over ₱1,000.',
    '{"type":"fixed_amount","value":100}', NOW(), NOW() + INTERVAL '30 days', 'published', 'coupon'),
  ('44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111103',
    'PAINT15', '15% off all rollers, trays, brushes, and paint this week.',
    '{"type":"percentage","value":15}', NOW(), NOW() + INTERVAL '21 days', 'published', 'deal'),

  -- Aura Hair Studio
  ('44444444-4444-4444-4444-444444444407', '11111111-1111-1111-1111-111111111104',
    'BLOWOUT-FREE', 'Book any haircut service and get a blowout free.',
    '{"type":"percentage","value":50}', NOW(), NOW() + INTERVAL '14 days', 'published', 'coupon'),
  ('44444444-4444-4444-4444-444444444408', '11111111-1111-1111-1111-111111111104',
    'HAIR500', '₱500 off full hair color — shoulder length and above.',
    '{"type":"fixed_amount","value":500}', NOW(), NOW() + INTERVAL '30 days', 'published', 'deal'),

  -- Luna & Leaf Bistro
  ('44444444-4444-4444-4444-444444444409', '11111111-1111-1111-1111-111111111105',
    'SMOOTHIE-FREE', 'Order any grain or acai bowl and get a smoothie free.',
    '{"type":"percentage","value":20}', NOW(), NOW() + INTERVAL '5 days', 'published', 'coupon'),
  ('44444444-4444-4444-4444-444444444410', '11111111-1111-1111-1111-111111111105',
    'FIRST15', 'First-time dine-in customers get 15% off their entire bill.',
    '{"type":"percentage","value":15}', NOW(), NOW() + INTERVAL '60 days', 'published', 'deal'),

  -- El Tapas & Brew
  ('44444444-4444-4444-4444-444444444411', '11111111-1111-1111-1111-111111111106',
    'HAPPYHOUR', '2-for-1 craft beers, weekdays 5–7 PM.',
    '{"type":"percentage","value":50}', NOW(), NOW() + INTERVAL '30 days', 'published', 'deal'),
  ('44444444-4444-4444-4444-444444444412', '11111111-1111-1111-1111-111111111106',
    'PULUTAN50', '₱50 off any Pulutan Platter order of ₱250 and above.',
    '{"type":"fixed_amount","value":50}', NOW(), NOW() + INTERVAL '21 days', 'published', 'coupon'),

  -- Iloilo Street Eats
  ('44444444-4444-4444-4444-444444444413', '11111111-1111-1111-1111-111111111107',
    'ISAW10', 'Order 10 isaw skewers and receive 5 pieces free.',
    '{"type":"percentage","value":33}', NOW(), NOW() + INTERVAL '2 days', 'published', 'deal'),
  ('44444444-4444-4444-4444-444444444414', '11111111-1111-1111-1111-111111111107',
    'ORDER15', '15% off any combined street food order totaling ₱100+.',
    '{"type":"percentage","value":15}', NOW(), NOW() + INTERVAL '30 days', 'published', 'coupon'),

  -- Sari-Sari ni Nena
  ('44444444-4444-4444-4444-444444444415', '11111111-1111-1111-1111-111111111108',
    'FREE-EGGS', 'Get 2 free eggs with any single purchase of ₱50 or more.',
    '{"type":"fixed_amount","value":20}', NOW(), NOW() + INTERVAL '7 days', 'published', 'coupon'),
  ('44444444-4444-4444-4444-444444444416', '11111111-1111-1111-1111-111111111108',
    'NOODLES20', '₱20 off the 12-pack instant noodles bundle — today only.',
    '{"type":"fixed_amount","value":20}', NOW(), NOW() + INTERVAL '30 days', 'published', 'deal'),

  -- Hablon & Hue Boutique
  ('44444444-4444-4444-4444-444444444417', '11111111-1111-1111-1111-111111111109',
    'HABLON10', '10% off all handwoven hablon blouses, scarves, and accessories.',
    '{"type":"percentage","value":10}', NOW(), NOW() + INTERVAL '30 days', 'published', 'coupon'),
  ('44444444-4444-4444-4444-444444444418', '11111111-1111-1111-1111-111111111109',
    'FREE-TOTE', 'Buy any dress and receive a complimentary souvenir tote bag.',
    '{"type":"percentage","value":15}', NOW(), NOW() + INTERVAL '6 days', 'published', 'deal'),

  -- PageTurner Books
  ('44444444-4444-4444-4444-444444444419', '11111111-1111-1111-1111-111111111110',
    'BOOKS50', '₱50 off any single transaction of ₱500 and above.',
    '{"type":"fixed_amount","value":50}', NOW(), NOW() + INTERVAL '30 days', 'published', 'coupon'),
  ('44444444-4444-4444-4444-444444444420', '11111111-1111-1111-1111-111111111110',
    'BOOKMARK-FREE', 'Free curated local-art bookmark set with every book purchase this week.',
    '{"type":"percentage","value":10}', NOW(), NOW() + INTERVAL '14 days', 'published', 'deal'),

  -- Serenity Spa Iloilo
  ('44444444-4444-4444-4444-444444444421', '11111111-1111-1111-1111-111111111111',
    'MASSAGE20', '20% off your first massage. Valid on Swedish or Hilot.',
    '{"type":"percentage","value":20}', NOW(), NOW() + INTERVAL '30 days', 'published', 'deal'),
  ('44444444-4444-4444-4444-444444444422', '11111111-1111-1111-1111-111111111111',
    'FOOT-SCRUB', 'Complimentary foot scrub with any Hot Stone Therapy booking.',
    '{"type":"percentage","value":15}', NOW(), NOW() + INTERVAL '21 days', 'published', 'coupon'),

  -- IronForge Fitness
  ('44444444-4444-4444-4444-444444444423', '11111111-1111-1111-1111-111111111112',
    'GYM-FIRST', 'New members only — first month at ₱500 instead of ₱800.',
    '{"type":"fixed_amount","value":300}', NOW(), NOW() + INTERVAL '30 days', 'published', 'deal'),
  ('44444444-4444-4444-4444-444444444424', '11111111-1111-1111-1111-111111111112',
    'FREE-CLASS', 'Choose one free Yoga or Zumba class when you sign up monthly.',
    '{"type":"percentage","value":100}', NOW(), NOW() + INTERVAL '14 days', 'published', 'coupon'),

  -- FixRight Repair Hub
  ('44444444-4444-4444-4444-444444444425', '11111111-1111-1111-1111-111111111113',
    'REPAIR100', '₱100 off screen replacements or battery swaps. One use per customer.',
    '{"type":"fixed_amount","value":100}', NOW(), NOW() + INTERVAL '30 days', 'published', 'coupon'),
  ('44444444-4444-4444-4444-444444444426', '11111111-1111-1111-1111-111111111113',
    'DIAG-FREE', 'Free diagnostics check on any laptop before committing to repair.',
    '{"type":"percentage","value":100}', NOW(), NOW() + INTERVAL '21 days', 'published', 'deal'),

  -- Casa Ilongga B&B
  ('44444444-4444-4444-4444-444444444427', '11111111-1111-1111-1111-111111111114',
    'WEEKEND15', '15% off any Friday–Sunday stay.',
    '{"type":"percentage","value":15}', NOW(), NOW() + INTERVAL '30 days', 'published', 'coupon'),
  ('44444444-4444-4444-4444-444444444428', '11111111-1111-1111-1111-111111111114',
    'BFAST-FREE', 'Free full breakfast for two on any 3-night booking this month.',
    '{"type":"percentage","value":10}', NOW(), NOW() + INTERVAL '30 days', 'published', 'deal'),

  -- Ilonggo Craft Workshop
  ('44444444-4444-4444-4444-444444444429', '11111111-1111-1111-1111-111111111115',
    'WEAVE-2FOR1', 'Bring a friend to Hablon Weaving Class — both attend for the price of one.',
    '{"type":"percentage","value":50}', NOW(), NOW() + INTERVAL '14 days', 'published', 'deal'),
  ('44444444-4444-4444-4444-444444444430', '11111111-1111-1111-1111-111111111115',
    'WORKSHOP100', '₱100 off any single workshop (weaving, pottery, dance, or cooking).',
    '{"type":"fixed_amount","value":100}', NOW(), NOW() + INTERVAL '30 days', 'published', 'coupon'),

  -- The Lampara Live Music Bar
  ('44444444-4444-4444-4444-444444444431', '11111111-1111-1111-1111-111111111116',
    'WEEKNIGHT-FREE', 'Free entry every Monday–Thursday for live music nights.',
    '{"type":"percentage","value":100}', NOW(), NOW() + INTERVAL '14 days', 'published', 'deal'),
  ('44444444-4444-4444-4444-444444444432', '11111111-1111-1111-1111-111111111116',
    'BOOTH10', '10% off any Private Booth booking for 4 or more guests.',
    '{"type":"percentage","value":10}', NOW(), NOW() + INTERVAL '30 days', 'published', 'coupon')
ON CONFLICT (id) DO NOTHING;
