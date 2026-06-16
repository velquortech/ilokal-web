-- bulk_seed.sql — procedural "filler" volume layered ON TOP of the hand-crafted
-- hero seeds (businesses/products/coupons/ratings/follows/posts/subscriptions).
--
-- Purpose: give every list enough rows to cross ≥2 pagination pages (page sizes
-- are 10–20) and to cover every branch/enum/edge-case the app exercises:
--   * verified businesses across all categories + scattered geo (nearby map)
--   * products with active/unlisted/disabled + sale_price
--   * coupons covering the full matrix: deal vs coupon, requires_follow,
--     branch-scoped, redemption caps near limit, and draft/expired/
--     not-yet-started/archived (negative-path / access-invariant tests)
--   * promoted subscriptions (powers the "featured" deals feed) + free + expired
--   * Updates-feed posts, follower badges, rating distributions (some empty)
--   * testuser redemptions across the active / claimed / expired filter states
--
-- DEPENDS ON (run order — see Makefile CLOUD_SEED_FILES): runs AFTER businesses,
-- products, coupons, follows so it can (a) reuse already-uploaded hero image paths
-- (no new storage objects needed — filler rows point at existing objects per
-- bucket) and (b) reuse the 90-account follower pool from follows.sql
-- (dddddddd-0000-0000-0000-0000000000NN). Runs BEFORE view_counts so its UPDATEs
-- (which key off md5(id) over ALL rows) cover the filler too.
--
-- Idempotent: deterministic UUIDs (f0/f1/f2/f3/f4/f6 prefixes) + ON CONFLICT, so
-- it is safe to re-run; the cloud clean-replace wipes first anyway.
--
-- session_replication_role=replica bypasses FK/auto-triggers during the bulk insert
-- (matches the other seeds). The redemption-code trigger is ENABLE ALWAYS, so it
-- still fires and fills user_redemptions.code.

SET session_replication_role = replica;

DO $$
DECLARE
  owner_id   CONSTANT uuid := '00000000-0000-0000-0000-000000000001';  -- Seed Owner (businesses.sql)
  testuser   CONSTANT uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';  -- testuser@ilokal.dev
  n_biz      CONSTANT int  := 40;

  cat_ids    uuid[];
  logo_pool  text[];   -- shop-logos paths (reused from hero businesses)
  intr_pool  text[];   -- interior-images paths
  prod_pool  text[];   -- product-images paths
  plan_free  uuid; plan_pro_m uuid; plan_pro_y uuid; plan_beta uuid;

  name_pre text[] := ARRAY['Sunrise','Golden','Urban','Coastal','Heritage','Bayanihan','Island','Maharlika','Northern','Southern','Riverside','Highland','Downtown','Sampaguita','Iloilo','Panay','Visayan','Tropical','Calle','Plaza'];
  name_suf text[] := ARRAY['Eatery','Trading','Crafts','Provisions','Studio','Wellness','Boutique','Workshop','Pantry','Collective','Co.','Hub','Goods','Emporium','Kitchen','Corner','Supply','Market','Atelier','Lounge'];
  prod_adj text[] := ARRAY['Classic','Premium','House','Signature','Daily','Special','Local','Fresh','Artisan','Value'];
  prod_nn  text[] := ARRAY['Blend','Set','Combo','Plate','Bundle','Pack','Service','Special','Platter','Box'];

  b int; p int; c int; k int;
  biz_id uuid; br_id uuid; coup_id uuid; prod_id uuid; cat_id uuid;
  lat double precision; lng double precision;
  price numeric; sprice numeric;
  fcount int; rcount int; follower uuid;
  plan_pick uuid; substat text; period_end timestamptz;
  disc jsonb; cstatus text; ptype text; reqfollow boolean; cbranch uuid;
  start_d timestamptz; exp_d timestamptz; arch timestamptz; maxg int; cur int;
BEGIN
  SELECT array_agg(id ORDER BY name) INTO cat_ids FROM public.business_categories WHERE deleted_at IS NULL;
  SELECT array_agg(logo_url) INTO logo_pool FROM public.businesses WHERE logo_url IS NOT NULL;
  SELECT array_agg(x) INTO intr_pool FROM (SELECT unnest(interior_images) x FROM public.businesses WHERE interior_images IS NOT NULL) t WHERE x IS NOT NULL;
  SELECT array_agg(image_url) INTO prod_pool FROM public.products WHERE image_url IS NOT NULL;
  SELECT id INTO plan_free  FROM public.subscription_plans WHERE name='Free Tier'   LIMIT 1;
  SELECT id INTO plan_pro_m FROM public.subscription_plans WHERE name='Pro Monthly' LIMIT 1;
  SELECT id INTO plan_pro_y FROM public.subscription_plans WHERE name='Pro Yearly'  LIMIT 1;
  SELECT id INTO plan_beta  FROM public.subscription_plans WHERE name='Beta Access' LIMIT 1;

  -- Fallbacks so the script still runs if a pool is somehow empty.
  IF logo_pool IS NULL THEN logo_pool := ARRAY['11111111-1111-1111-1111-111111111101/logo.jpg']; END IF;
  IF intr_pool IS NULL THEN intr_pool := ARRAY['11111111-1111-1111-1111-111111111101/hero.jpg']; END IF;
  IF prod_pool IS NULL THEN prod_pool := logo_pool; END IF;

  FOR b IN 1..n_biz LOOP
    biz_id := ('f0000001-0000-0000-0000-' || lpad(b::text,12,'0'))::uuid;
    br_id  := ('f0000002-0000-0000-0000-' || lpad(b::text,12,'0'))::uuid;
    cat_id := cat_ids[1 + (b % array_length(cat_ids,1))];
    lat := 10.70 + (((b * 37) % 100) / 1000.0) - 0.05;    -- ~10.65 .. 10.75
    lng := 122.55 + (((b * 53) % 100) / 1000.0) - 0.05;   -- ~122.50 .. 122.60

    INSERT INTO public.businesses
      (id, owner_id, shop_name, description, location, logo_url, interior_images, status, category_id, business_category)
    VALUES (
      biz_id, owner_id,
      name_pre[1+(b % array_length(name_pre,1))] || ' ' || name_suf[1+((b*3) % array_length(name_suf,1))],
      'Sample verified business #' || b || ' for end-to-end testing of listings, search and the nearby map.',
      jsonb_build_object('province','Iloilo','city','Iloilo City','barangay','Brgy '||b,
                         'street_address',b||' Sample St.','zip_code','5000',
                         'latitude',lat,'longitude',lng,'geometry','lat:'||lat||',lng:'||lng),
      logo_pool[1+(b % array_length(logo_pool,1))],
      ARRAY[ intr_pool[1+(b % array_length(intr_pool,1))],
             intr_pool[1+((b*2) % array_length(intr_pool,1))] ],
      'verified',
      cat_id,
      jsonb_build_object('name','General','type','predefined')
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.branches (id, business_id, name, address, location, status)
    VALUES (br_id, biz_id, 'Main Branch', b||' Sample St., Iloilo City, Iloilo',
            ST_MakePoint(lng, lat)::geography, 'active')
    ON CONFLICT (id) DO NOTHING;

    -- ── Products: 13 each (active / unlisted / disabled mix; some on sale) ──
    FOR p IN 1..13 LOOP
      prod_id := ('f1000000-0000-0000-0000-' || lpad((b*100+p)::text,12,'0'))::uuid;
      price := 50 + (((b*7 + p*13) % 60) * 10);   -- 50 .. 640
      IF p % 5 = 0 THEN sprice := round(price * 0.8, 2); ELSE sprice := NULL; END IF;
      INSERT INTO public.products
        (id, business_id, name, description, price, sale_price, image_url, status, category_id, is_available)
      VALUES (
        prod_id, biz_id,
        prod_adj[1+((b+p) % array_length(prod_adj,1))] || ' ' || prod_nn[1+((b*2+p) % array_length(prod_nn,1))] || ' ' || p,
        'Sample product '||p||' for business '||b||'.',
        price, sprice,
        prod_pool[1+((b*p) % array_length(prod_pool,1))],
        CASE WHEN p % 11 = 0 THEN 'disabled' WHEN p % 7 = 0 THEN 'unlisted' ELSE 'active' END,
        cat_id,
        (p % 11 <> 0)
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;

    -- ── Coupons: 3 each, deterministic variety matrix ──
    FOR c IN 1..3 LOOP
      coup_id := ('f2000000-0000-0000-0000-' || lpad((b*100+c)::text,12,'0'))::uuid;
      k := (b*3 + c);
      IF k % 2 = 0 THEN disc := jsonb_build_object('type','percentage','value', 10 + (k % 5)*5);
      ELSE              disc := jsonb_build_object('type','fixed_amount','value', 50 + (k % 6)*25); END IF;

      start_d := NOW() - interval '10 days';
      exp_d   := NOW() + interval '30 days';
      arch    := NULL;
      cstatus := 'published';
      CASE k % 9
        WHEN 0 THEN cstatus := 'draft';                       -- hidden: draft
        WHEN 1 THEN exp_d   := NOW() - interval '2 days';      -- hidden: expired
        WHEN 2 THEN start_d := NOW() + interval '5 days';      -- hidden: not yet started
        WHEN 3 THEN arch    := NOW() - interval '1 day';       -- hidden: archived
        ELSE   NULL;
      END CASE;

      ptype     := CASE WHEN c = 1 THEN 'deal' ELSE 'coupon' END;  -- ≥1 deal/business for the deals feed
      reqfollow := (k % 6 = 0);                                    -- follow-gated subset
      cbranch   := CASE WHEN c = 3 THEN br_id ELSE NULL END;       -- branch-scoped subset
      IF k % 8 = 0 THEN maxg := 100; cur := 98; ELSE maxg := NULL; cur := 0; END IF;  -- near-cap subset

      INSERT INTO public.coupons
        (id, business_id, code, description, discount, start_date, expiry_date, status,
         promotion_type, requires_follow, branch_id, max_redemptions_global,
         max_redemptions_per_user, current_redemptions, archived_at)
      VALUES (
        coup_id, biz_id, 'SAVE'||b||'-'||c,
        CASE WHEN ptype='deal' THEN 'Limited-time deal '||c ELSE 'Coupon offer '||c END,
        disc, start_d, exp_d, cstatus, ptype, reqfollow, cbranch, maxg, 3, cur, arch
      ) ON CONFLICT (id) DO NOTHING;
    END LOOP;

    -- ── Updates-feed posts: 1 each + an extra for every 3rd business ──
    INSERT INTO public.business_posts (id, business_id, title, body, image_url, published_at)
    VALUES (('f3000000-0000-0000-0000-'||lpad((b*10+1)::text,12,'0'))::uuid, biz_id,
            'What''s new (#'||b||')', 'Sample update post for the mobile Updates feed.',
            intr_pool[1+(b % array_length(intr_pool,1))], NOW() - (b||' hours')::interval)
    ON CONFLICT (id) DO NOTHING;
    IF b % 3 = 0 THEN
      INSERT INTO public.business_posts (id, business_id, title, body, image_url, published_at)
      VALUES (('f3000000-0000-0000-0000-'||lpad((b*10+2)::text,12,'0'))::uuid, biz_id,
              'Weekend special (#'||b||')', 'Another sample post.', NULL,
              NOW() - ((b+12)||' hours')::interval)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    -- ── Subscriptions: ~half the businesses, promoted/free/expired mix ──
    IF b % 2 = 0 THEN
      CASE b % 6
        WHEN 0 THEN plan_pick := plan_pro_y; substat := 'active'; period_end := NOW() + interval '1 year';
        WHEN 2 THEN plan_pick := plan_pro_m; substat := 'active'; period_end := NOW() + interval '1 month';
        WHEN 4 THEN plan_pick := plan_beta;  substat := 'active'; period_end := NOW() + interval '3 months';
        ELSE        plan_pick := plan_free;  substat := 'active'; period_end := NOW() + interval '1 month';
      END CASE;
      IF b % 10 = 0 THEN substat := 'expired'; period_end := NOW() - interval '5 days'; END IF;
      INSERT INTO public.business_subscriptions
        (id, business_id, plan_id, status, current_period_start, current_period_end)
      VALUES (('f4000000-0000-0000-0000-'||lpad(b::text,12,'0'))::uuid, biz_id, plan_pick,
              substat::sub_status, NOW() - interval '10 days', period_end)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    -- ── Follows: varied follower count from the 90-account pool ──
    fcount := 5 + ((b * 11) % 70);   -- 5 .. 74
    FOR k IN 1..fcount LOOP
      follower := ('dddddddd-0000-0000-0000-' || lpad(k::text,12,'0'))::uuid;
      INSERT INTO public.follows (user_id, business_id, created_at)
      VALUES (follower, biz_id, NOW() - (k||' days')::interval)
      ON CONFLICT (user_id, business_id) DO NOTHING;
    END LOOP;

    -- ── Business ratings: a few each; skip every 7th for empty-state coverage ──
    IF b % 7 <> 0 THEN
      rcount := 3 + (b % 8);
      FOR k IN 1..rcount LOOP
        follower := ('dddddddd-0000-0000-0000-' || lpad(k::text,12,'0'))::uuid;
        INSERT INTO public.business_ratings (user_id, business_id, rating, comment)
        VALUES (follower, biz_id, 3 + ((b+k) % 3), 'Sample review '||k)
        ON CONFLICT (user_id, business_id) DO NOTHING;
      END LOOP;
    END IF;

    -- ── Product ratings: rate first 3 products of every other business ──
    IF b % 2 = 1 THEN
      FOR p IN 1..3 LOOP
        prod_id := ('f1000000-0000-0000-0000-' || lpad((b*100+p)::text,12,'0'))::uuid;
        FOR k IN 1..(2 + (p % 3)) LOOP
          follower := ('dddddddd-0000-0000-0000-' || lpad(k::text,12,'0'))::uuid;
          INSERT INTO public.ratings (user_id, product_id, business_id, rating, review_text)
          VALUES (follower, prod_id, biz_id, 3 + ((p+k) % 3), 'Sample product review '||k)
          ON CONFLICT (user_id, product_id) DO NOTHING;
        END LOOP;
      END LOOP;
    END IF;

  END LOOP;

  -- ── testuser redemptions across the active / claimed / expired filter states ──
  -- Pick currently-valid, published, non-follow-gated filler coupons.
  k := 0;
  FOR coup_id, cbranch IN
    SELECT c.id, COALESCE(c.branch_id, br.id)
    FROM public.coupons c
    JOIN public.branches br ON br.business_id = c.business_id
    WHERE c.id::text LIKE 'f2000000-%'
      AND c.status = 'published' AND c.archived_at IS NULL
      AND c.start_date <= NOW() AND c.expiry_date > NOW()
      AND NOT c.requires_follow
    ORDER BY c.id
    LIMIT 15
  LOOP
    k := k + 1;
    INSERT INTO public.user_redemptions
      (id, user_id, coupon_id, branch_id, redeemed_at, expires_at, is_claimed)
    VALUES (
      ('f6000000-0000-0000-0000-'||lpad(k::text,12,'0'))::uuid,
      testuser, coup_id, cbranch,
      NOW() - (k||' days')::interval,
      CASE WHEN k % 3 = 2 THEN NOW() - interval '1 day' ELSE NOW() + interval '20 days' END,  -- every 3rd expired
      (k % 3 = 1)                                                                              -- every 3rd claimed
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

RESET session_replication_role;
