-- Dev seed: business ratings and product ratings from bulk app_user accounts
-- Depends on: users.sql, businesses.sql, products.sql
-- Tables: public.business_ratings (one per user+business), public.ratings (product ratings)
--
-- testuser@ilokal.dev already has one rating per business in users.sql.
-- This file adds ratings from user1-20@test.local using modulo-based user rotation
-- so every business and every product gets a spread of ratings from different users.

DO $$
DECLARE
  _users uuid[];
  _n     int;
  _uid   uuid;
  _i     int;
  _j     int;
  _start int;
  _count int;
  _ridx  int;

  -- Ratings pattern: 20 elements, positive-skewed (45% fives, 40% fours, 15% threes)
  _stars CONSTANT smallint[] := ARRAY[5,4,5,5,4,3,5,4,5,4,5,5,4,3,5,4,5,4,5,3]::smallint[];

  -- Business UUIDs [1..5]
  _biz CONSTANT uuid[] := ARRAY[
    '11111111-1111-1111-1111-111111111101'::uuid,  -- The Artisan Roastery
    '11111111-1111-1111-1111-111111111102'::uuid,  -- Flora & Flour Bakery
    '11111111-1111-1111-1111-111111111103'::uuid,  -- The Handy Corner
    '11111111-1111-1111-1111-111111111104'::uuid,  -- Aura Hair Studio
    '11111111-1111-1111-1111-111111111105'::uuid   -- Luna & Leaf Bistro
  ];

  -- 4 comments per business stored flat (index = (_i-1)*4 + (_j%4) + 1)
  _biz_comments CONSTANT text[] := ARRAY[
    -- Artisan Roastery
    'Best specialty coffee in Iloilo. The pour over is exceptional.',
    'Really love the single-origin selection. Skilled baristas.',
    'Cosy vibe and great beans — gets crowded on weekends though.',
    'Top-tier roast quality. The cold brew is a must-try.',
    -- Flora & Flour Bakery
    'Ube pandesal is life-changing. Come here every weekend.',
    'Freshest Filipino breads in the neighbourhood.',
    'Great variety of pastries. The ensaymada is incredible.',
    'Authentic flavours and very affordable prices.',
    -- The Handy Corner
    'Good stock of tools. Found everything I needed in one trip.',
    'Reliable neighbourhood hardware store with fair prices.',
    'Staff are helpful and the store is well organised.',
    'Decent selection for most home repair needs.',
    -- Aura Hair Studio
    'Amazing stylists — my hair colour came out exactly as I wanted.',
    'Best precision cut in Iloilo City. Very professional team.',
    'Love the keratin treatment result. Will definitely be back.',
    'Skilled staff, transparent pricing, and great results.',
    -- Luna & Leaf Bistro
    'Turmeric latte is a must-try. Freshest ingredients around.',
    'Love the farm-to-table concept. Bowls are filling and healthy.',
    'Best healthy dining spot in Iloilo City without question.',
    'The acai bowl and grain bowl are both fantastic.'
  ];

  -- All 25 product UUIDs in seed order [1..25]
  -- 5 per business: Artisan 1-5, Flora 6-10, Handy 11-15, Aura 16-20, Luna 21-25
  _prod CONSTANT uuid[] := ARRAY[
    '33333333-3333-3333-3333-333333333301'::uuid,  -- Artisan: Flat White / Pour Over
    '33333333-3333-3333-3333-333333333302'::uuid,  -- Artisan: Pour Over / Flat White
    '33333333-3333-3333-3333-333333333303'::uuid,  -- Artisan: Cold Brew
    '33333333-3333-3333-3333-333333333304'::uuid,  -- Artisan: Butter Croissant
    '33333333-3333-3333-3333-333333333305'::uuid,  -- Artisan: Avocado Toast
    '33333333-3333-3333-3333-333333333306'::uuid,  -- Flora: Ube Pandesal
    '33333333-3333-3333-3333-333333333307'::uuid,  -- Flora: Ensaymada
    '33333333-3333-3333-3333-333333333308'::uuid,  -- Flora: Sans Rival
    '33333333-3333-3333-3333-333333333309'::uuid,  -- Flora: Spanish Bread
    '33333333-3333-3333-3333-333333333310'::uuid,  -- Flora: Buko Pie
    '33333333-3333-3333-3333-333333333311'::uuid,  -- Handy: Claw Hammer
    '33333333-3333-3333-3333-333333333312'::uuid,  -- Handy: Power Drill
    '33333333-3333-3333-3333-333333333313'::uuid,  -- Handy: Paint Roller Set
    '33333333-3333-3333-3333-333333333314'::uuid,  -- Handy: Measuring Tape
    '33333333-3333-3333-3333-333333333315'::uuid,  -- Handy: Work Gloves
    '33333333-3333-3333-3333-333333333316'::uuid,  -- Aura: Haircut (Men)
    '33333333-3333-3333-3333-333333333317'::uuid,  -- Aura: Haircut (Women)
    '33333333-3333-3333-3333-333333333318'::uuid,  -- Aura: Hair Color
    '33333333-3333-3333-3333-333333333319'::uuid,  -- Aura: Blowout
    '33333333-3333-3333-3333-333333333320'::uuid,  -- Aura: Hair Treatment
    '33333333-3333-3333-3333-333333333321'::uuid,  -- Luna: Acai Bowl
    '33333333-3333-3333-3333-333333333322'::uuid,  -- Luna: Grain Bowl
    '33333333-3333-3333-3333-333333333323'::uuid,  -- Luna: Green Smoothie
    '33333333-3333-3333-3333-333333333324'::uuid,  -- Luna: Turmeric Latte
    '33333333-3333-3333-3333-333333333325'::uuid   -- Luna: Buddha Bowl
  ];

  -- 15 generic product reviews that cycle across all products
  _prod_reviews CONSTANT text[] := ARRAY[
    'Really happy with this. Great quality and value.',
    'One of my favourites on the menu. Will order again.',
    'Worth every peso. Consistently well made.',
    'Good, but expected a bit more flavour.',
    'Excellent. Never disappointed whenever I visit.',
    'Really fresh and well prepared.',
    'A must-try. Highly recommend to anyone.',
    'Solid product. Nothing to complain about.',
    'Great value for the price point.',
    'My go-to order every single visit.',
    'Very enjoyable. Fresh and high quality.',
    'Decent. Might try something else next time.',
    'Absolutely love this. A regular order now.',
    'Well made and just the right portion.',
    'Good stuff. Really glad I tried it.'
  ];

BEGIN
  SELECT ARRAY(
    SELECT id FROM public.profiles
    WHERE role = 'app_user'
      AND email LIKE 'user%@test.local'
    ORDER BY (regexp_replace(email, '\D', '', 'g'))::int
    LIMIT 20
  ) INTO _users;

  _n := COALESCE(array_length(_users, 1), 0);
  IF _n = 0 THEN
    RAISE NOTICE 'No bulk app_users found — run users.sql seed first.';
    RETURN;
  END IF;

  -- ── business_ratings (12–15 per business, staggered users) ───────────────────
  -- UNIQUE (user_id, business_id) — ON CONFLICT DO NOTHING is safe to re-run.

  FOR _i IN 1..5 LOOP
    _start := ((_i - 1) * 4) % _n;       -- stagger starting user index per business
    _count := 12 + ((_i + 2) % 4);       -- 12, 13, 14, 15, 12 ratings per business

    FOR _j IN 0..(_count - 1) LOOP
      _uid  := _users[(_start + _j) % _n + 1];
      _ridx := (_i + _j * 3) % array_length(_stars, 1) + 1;

      INSERT INTO public.business_ratings (user_id, business_id, rating, comment)
      VALUES (
        _uid,
        _biz[_i],
        _stars[_ridx],
        _biz_comments[(_i - 1) * 4 + (_j % 4) + 1]
      ) ON CONFLICT (user_id, business_id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- ── product ratings — all 25 products (7–9 ratings each) ─────────────────────
  -- public.ratings has no unique constraint on (user_id, product_id).
  -- Guard with NOT EXISTS so re-running the seed does not create duplicates.

  FOR _i IN 1..25 LOOP
    _start := ((_i - 1) * 3) % _n;       -- stagger starting user index per product
    _count := 7 + ((_i + 1) % 3);        -- 7, 8, or 9 ratings per product

    FOR _j IN 0..(_count - 1) LOOP
      _uid  := _users[(_start + _j) % _n + 1];
      _ridx := (_i * 2 + _j * 7) % array_length(_stars, 1) + 1;

      IF NOT EXISTS (
        SELECT 1 FROM public.ratings
        WHERE user_id = _uid AND product_id = _prod[_i]
      ) THEN
        INSERT INTO public.ratings (user_id, product_id, rating, review_text)
        VALUES (
          _uid,
          _prod[_i],
          _stars[_ridx],
          _prod_reviews[(_i + _j) % array_length(_prod_reviews, 1) + 1]
        );
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Ratings seed complete — 5 businesses, 25 products.';
END $$;
