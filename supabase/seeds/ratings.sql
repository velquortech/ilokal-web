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

  -- Business UUIDs [1..16]
  _biz CONSTANT uuid[] := ARRAY[
    '11111111-1111-1111-1111-111111111101'::uuid,  -- The Artisan Roastery
    '11111111-1111-1111-1111-111111111102'::uuid,  -- Flora & Flour Bakery
    '11111111-1111-1111-1111-111111111103'::uuid,  -- The Handy Corner
    '11111111-1111-1111-1111-111111111104'::uuid,  -- Aura Hair Studio
    '11111111-1111-1111-1111-111111111105'::uuid,  -- Luna & Leaf Bistro
    '11111111-1111-1111-1111-111111111106'::uuid,  -- El Tapas & Brew
    '11111111-1111-1111-1111-111111111107'::uuid,  -- Iloilo Street Eats
    '11111111-1111-1111-1111-111111111108'::uuid,  -- Sari-Sari ni Nena
    '11111111-1111-1111-1111-111111111109'::uuid,  -- Hablon & Hue Boutique
    '11111111-1111-1111-1111-111111111110'::uuid,  -- PageTurner Books
    '11111111-1111-1111-1111-111111111111'::uuid,  -- Serenity Spa Iloilo
    '11111111-1111-1111-1111-111111111112'::uuid,  -- IronForge Fitness
    '11111111-1111-1111-1111-111111111113'::uuid,  -- FixRight Repair Hub
    '11111111-1111-1111-1111-111111111114'::uuid,  -- Casa Ilongga B&B
    '11111111-1111-1111-1111-111111111115'::uuid,  -- Ilonggo Craft Workshop
    '11111111-1111-1111-1111-111111111116'::uuid   -- The Lampara Live Music Bar
  ];

  -- 4 comments per business × 16 businesses = 64 items
  _biz_comments CONSTANT text[] := ARRAY[
    -- The Artisan Roastery
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
    'The acai bowl and grain bowl are both fantastic.',
    -- El Tapas & Brew
    'Great craft beers and the pulutan platter is generous. Perfect night out.',
    'Love the lively atmosphere. The mojito is refreshing and not too sweet.',
    'Best bar in the City Proper area. Good music and friendly staff.',
    'Solid pulutan selection. Prices are fair for the quality you get.',
    -- Iloilo Street Eats
    'Best isaw in Iloilo. The sauce is perfectly balanced sweet and spicy.',
    'Authentic street food experience. The batchoy is comforting and rich.',
    'Always fresh and affordable. My go-to merienda stop.',
    'The BBQ skewers are perfectly charred. Never a disappointment.',
    -- Sari-Sari ni Nena
    'Everything you need just around the corner. Very convenient.',
    'Fresh eggs every morning. Owner is always friendly and helpful.',
    'Best prices in the neighbourhood. Always well-stocked.',
    'My daily stop for essentials. Never run out of the basics here.',
    -- Hablon & Hue Boutique
    'Beautiful hablon pieces. Proud to wear authentic Ilonggo textiles.',
    'Unique designs you will not find elsewhere. Quality is excellent.',
    'The tote bags make wonderful pasalubong. My family loved them.',
    'Stylish and proudly local. Great selection of wearable cultural pieces.',
    -- PageTurner Books
    'Amazing selection of Filipino literature. Staff gives great reading recs.',
    'Cosy bookshop with a curated collection. Bullet journals are top quality.',
    'Love how they highlight local authors. Supporting Filipino writers here.',
    'Well-organised and the stationery section is excellent for students.',
    -- Serenity Spa Iloilo
    'Best hilot massage I have ever had. Left feeling completely refreshed.',
    'Very professional therapists and a calming atmosphere throughout.',
    'The facial treatment is worth every peso. Skin felt amazing after.',
    'Hot stone therapy was exactly what I needed. Will be back soon.',
    -- IronForge Fitness
    'Great equipment and the trainers are very motivating and approachable.',
    'Clean facility with a welcoming community. Yoga classes are excellent.',
    'Best gym value in Iloilo. Never feels overcrowded even at peak hours.',
    'Zumba class is so much fun. Instructors keep the energy high.',
    -- FixRight Repair Hub
    'Fixed my cracked phone screen perfectly. Half the price of the mall.',
    'Laptop repair was done quickly and professionally. Highly recommend.',
    'Honest diagnosis and fair pricing. No unnecessary repairs suggested.',
    'Reliable and trustworthy shop. My go-to for all repair needs.',
    -- Casa Ilongga B&B
    'Charming guesthouse with authentic Ilonggo hospitality. Highly recommend.',
    'The breakfast is wonderful and the room is spotlessly clean.',
    'Perfect location for exploring the city. Very comfortable stay.',
    'Lovely hosts who gave us the best local tips. Will stay again.',
    -- Ilonggo Craft Workshop
    'Learned so much about hablon weaving. Truly a cultural treasure.',
    'The cooking class was hands-on and delicious. Took home great recipes.',
    'Dinagyang dance workshop was exciting and great for all ages.',
    'Very knowledgeable instructors who share their passion for Ilonggo culture.',
    -- The Lampara Live Music Bar
    'Amazing live bands every weekend. Best entertainment spot in Iloilo.',
    'The acoustic nights are unforgettable. Perfect date night destination.',
    'Fantastic cocktails and great vibes. The private booth is worth it.',
    'Karaoke rooms are well-maintained and the song selection is huge.'
  ];

  -- All 69 product UUIDs in seed order [1..69]
  -- 5 per original business (1–25), 4 per new business (26–69)
  _prod CONSTANT uuid[] := ARRAY[
    -- The Artisan Roastery (products 301–305)
    '33333333-3333-3333-3333-333333333301'::uuid,
    '33333333-3333-3333-3333-333333333302'::uuid,
    '33333333-3333-3333-3333-333333333303'::uuid,
    '33333333-3333-3333-3333-333333333304'::uuid,
    '33333333-3333-3333-3333-333333333305'::uuid,
    -- Flora & Flour Bakery (306–310)
    '33333333-3333-3333-3333-333333333306'::uuid,
    '33333333-3333-3333-3333-333333333307'::uuid,
    '33333333-3333-3333-3333-333333333308'::uuid,
    '33333333-3333-3333-3333-333333333309'::uuid,
    '33333333-3333-3333-3333-333333333310'::uuid,
    -- The Handy Corner (311–315)
    '33333333-3333-3333-3333-333333333311'::uuid,
    '33333333-3333-3333-3333-333333333312'::uuid,
    '33333333-3333-3333-3333-333333333313'::uuid,
    '33333333-3333-3333-3333-333333333314'::uuid,
    '33333333-3333-3333-3333-333333333315'::uuid,
    -- Aura Hair Studio (316–320)
    '33333333-3333-3333-3333-333333333316'::uuid,
    '33333333-3333-3333-3333-333333333317'::uuid,
    '33333333-3333-3333-3333-333333333318'::uuid,
    '33333333-3333-3333-3333-333333333319'::uuid,
    '33333333-3333-3333-3333-333333333320'::uuid,
    -- Luna & Leaf Bistro (321–325)
    '33333333-3333-3333-3333-333333333321'::uuid,
    '33333333-3333-3333-3333-333333333322'::uuid,
    '33333333-3333-3333-3333-333333333323'::uuid,
    '33333333-3333-3333-3333-333333333324'::uuid,
    '33333333-3333-3333-3333-333333333325'::uuid,
    -- El Tapas & Brew (326–329)
    '33333333-3333-3333-3333-333333333326'::uuid,
    '33333333-3333-3333-3333-333333333327'::uuid,
    '33333333-3333-3333-3333-333333333328'::uuid,
    '33333333-3333-3333-3333-333333333329'::uuid,
    -- Iloilo Street Eats (330–333)
    '33333333-3333-3333-3333-333333333330'::uuid,
    '33333333-3333-3333-3333-333333333331'::uuid,
    '33333333-3333-3333-3333-333333333332'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    -- Sari-Sari ni Nena (334–337)
    '33333333-3333-3333-3333-333333333334'::uuid,
    '33333333-3333-3333-3333-333333333335'::uuid,
    '33333333-3333-3333-3333-333333333336'::uuid,
    '33333333-3333-3333-3333-333333333337'::uuid,
    -- Hablon & Hue Boutique (338–341)
    '33333333-3333-3333-3333-333333333338'::uuid,
    '33333333-3333-3333-3333-333333333339'::uuid,
    '33333333-3333-3333-3333-333333333340'::uuid,
    '33333333-3333-3333-3333-333333333341'::uuid,
    -- PageTurner Books (342–345)
    '33333333-3333-3333-3333-333333333342'::uuid,
    '33333333-3333-3333-3333-333333333343'::uuid,
    '33333333-3333-3333-3333-333333333344'::uuid,
    '33333333-3333-3333-3333-333333333345'::uuid,
    -- Serenity Spa Iloilo (346–349)
    '33333333-3333-3333-3333-333333333346'::uuid,
    '33333333-3333-3333-3333-333333333347'::uuid,
    '33333333-3333-3333-3333-333333333348'::uuid,
    '33333333-3333-3333-3333-333333333349'::uuid,
    -- IronForge Fitness (350–353)
    '33333333-3333-3333-3333-333333333350'::uuid,
    '33333333-3333-3333-3333-333333333351'::uuid,
    '33333333-3333-3333-3333-333333333352'::uuid,
    '33333333-3333-3333-3333-333333333353'::uuid,
    -- FixRight Repair Hub (354–357)
    '33333333-3333-3333-3333-333333333354'::uuid,
    '33333333-3333-3333-3333-333333333355'::uuid,
    '33333333-3333-3333-3333-333333333356'::uuid,
    '33333333-3333-3333-3333-333333333357'::uuid,
    -- Casa Ilongga B&B (358–361)
    '33333333-3333-3333-3333-333333333358'::uuid,
    '33333333-3333-3333-3333-333333333359'::uuid,
    '33333333-3333-3333-3333-333333333360'::uuid,
    '33333333-3333-3333-3333-333333333361'::uuid,
    -- Ilonggo Craft Workshop (362–365)
    '33333333-3333-3333-3333-333333333362'::uuid,
    '33333333-3333-3333-3333-333333333363'::uuid,
    '33333333-3333-3333-3333-333333333364'::uuid,
    '33333333-3333-3333-3333-333333333365'::uuid,
    -- The Lampara Live Music Bar (366–369)
    '33333333-3333-3333-3333-333333333366'::uuid,
    '33333333-3333-3333-3333-333333333367'::uuid,
    '33333333-3333-3333-3333-333333333368'::uuid,
    '33333333-3333-3333-3333-333333333369'::uuid
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

  FOR _i IN 1..16 LOOP
    _start := ((_i - 1) * 4) % _n;       -- stagger starting user index per business
    _count := 12 + ((_i + 2) % 4);       -- 12, 13, 14, 15 ratings cycling per business

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

  -- ── product ratings — all 69 products (7–9 ratings each) ─────────────────────
  -- public.ratings has no unique constraint on (user_id, product_id).
  -- Guard with NOT EXISTS so re-running the seed does not create duplicates.

  FOR _i IN 1..69 LOOP
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

  RAISE NOTICE 'Ratings seed complete — 16 businesses, 69 products.';
END $$;
