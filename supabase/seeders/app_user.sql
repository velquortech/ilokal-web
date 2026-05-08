-- Dev seed: test mobile user with subscriptions, redemptions, and ratings
-- Depends on: businesses.sql, coupons.sql

SET session_replication_role = replica;

-- Test mobile user profile (bypasses auth.users FK for local dev)
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'testuser@ilokal.dev', 'Test User', 'user')
ON CONFLICT (id) DO NOTHING;

-- Subscriptions: follows Artisan Roastery, Flora & Flour, Luna & Leaf
INSERT INTO public.subscriptions (id, user_id, business_id)
VALUES
  ('55555555-5555-5555-5555-555555555501', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111101'),
  ('55555555-5555-5555-5555-555555555502', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111102'),
  ('55555555-5555-5555-5555-555555555503', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111105')
ON CONFLICT (user_id, business_id) DO NOTHING;

-- Redemptions: active (not claimed, not expired) | claimed | expired
INSERT INTO public.user_redemptions (id, user_id, coupon_id, branch_id, redeemed_at, expires_at, is_claimed)
VALUES
  -- active: Cold Brew BOGO at Artisan Roastery Ermita — expires in 25 mins
  ('66666666-6666-6666-6666-666666666601',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '44444444-4444-4444-4444-444444444402',
    '22222222-2222-2222-2222-222222222201',
    NOW(), NOW() + INTERVAL '25 minutes', false),

  -- claimed: Free Pandesal at Flora & Flour Binondo
  ('66666666-6666-6666-6666-666666666602',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '44444444-4444-4444-4444-444444444403',
    '22222222-2222-2222-2222-222222222202',
    NOW() - INTERVAL '2 hours', NOW() - INTERVAL '105 minutes', true),

  -- expired: ₱100 Off Power Tools at Handy Corner Paco (not claimed, already expired)
  ('66666666-6666-6666-6666-666666666603',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '44444444-4444-4444-4444-444444444405',
    '22222222-2222-2222-2222-222222222203',
    NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', false)
ON CONFLICT (id) DO NOTHING;

-- Ratings: one per business (tests all filter states in the ratings endpoint)
INSERT INTO public.business_ratings (id, user_id, business_id, rating, comment)
VALUES
  ('77777777-7777-7777-7777-777777777701', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111101', 5, 'Best specialty coffee in Manila. The pour over is exceptional.'),
  ('77777777-7777-7777-7777-777777777702', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111102', 4, 'Ube pandesal is addictive. Gets crowded on weekends though.'),
  ('77777777-7777-7777-7777-777777777703', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111103', 3, 'Good stock. Staff could be more knowledgeable on products.'),
  ('77777777-7777-7777-7777-777777777704', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111104', 5, 'Amazing stylists. Hair color came out exactly as I wanted.'),
  ('77777777-7777-7777-7777-777777777705', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111105', 4, 'Healthy and filling bowls. Turmeric latte is a must-try.')
ON CONFLICT (id) DO NOTHING;

SET session_replication_role = DEFAULT;
