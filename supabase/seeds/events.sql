-- Events — content for the public events feed, home banner, and the admin
-- review queue.
--
-- Depends on: businesses.sql (FK business_id) and products.sql (FK product_id,
-- composite FK uq_products_id_business: a product can only be promoted by its
-- own shop). Locations are Iloilo City points so `events_nearby` and the
-- mobile feed find them.
--
-- Seeds insert as postgres (auth.uid() IS NULL), so `trg_set_event_initial_status`
-- passes the chosen status through untouched — `approved` rows are visible to
-- anonymous visitors (the explore banner + events feed), `pending_review` rows
-- populate the admin review queue, `draft` is owner-only, and `rejected` keeps
-- a review_note. `priority` drives banner order for approved rows. The follower
-- fan-out trigger is AFTER UPDATE OF status only, so plain inserts notify nobody.
--
-- Statuses on purpose:
--   approved       public (9)  — three carry banner priority (5, 3, 2)
--   pending_review admin queue (3)
--   rejected       with a review_note (1)
--   draft          owner-only (1)
--   approved + promoted product (1) — exercises the composite FK

-- The events feature ships DARK (migration 20260802034107 inserts
-- enable_events = 'false'), so these rows would be hidden from every public
-- surface unless the flag is flipped. The flip lives in events_enable.sql,
-- which is LOCAL-ONLY (Makefile seed-db + config.toml db reset) and is NOT in
-- CLOUD_SEED_FILES — so `make seed-cloud` keeps events dark in production.

INSERT INTO public.events (id, business_id, product_id, name, description, address,
                           location, image_url, starts_at, ends_at,
                           daily_start_time, daily_end_time, link_url, ticket_url,
                           status, review_note, reviewed_by, reviewed_at, priority)
VALUES
  -- ── approved ───────────────────────────────────────────────────────────────
  ('99999999-9999-9999-9999-999999999901',
   '11111111-1111-1111-1111-111111111101', NULL,
   'Saturday Public Cupping',
   'Bright, floral, and citrusy — a free guided cupping of this week''s new single-origin lots. First 12 seats, come early.',
   'Iznart St, Iloilo City Proper, Iloilo',
   ST_MakePoint(122.5642, 10.6956)::geography,
   'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '3 days 10:00', NOW() + INTERVAL '3 days 12:00',
   NULL, NULL,
   'https://www.instagram.com/theartisanroastery/', NULL,
   'approved', NULL,
   (SELECT id FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL LIMIT 1),
   NOW() - INTERVAL '1 day', 5),

  ('99999999-9999-9999-9999-999999999902',
   '11111111-1111-1111-1111-111111111101', NULL,
   'Pour-Over Masterclass',
   'Two hours of dialing in grind, water temp, and ratio. Beans included; take home the V60 technique.',
   'Plaza Libertad, Iloilo City Proper, Iloilo',
   ST_MakePoint(122.5684, 10.6928)::geography,
   'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '10 days 14:00', NOW() + INTERVAL '10 days 16:00',
   NULL, NULL,
   'https://www.instagram.com/theartisanroastery/', 'https://lu.ma/artisan-roastery',
   'approved', NULL,
   (SELECT id FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL LIMIT 1),
   NOW() - INTERVAL '1 day', 3),

  ('99999999-9999-9999-9999-999999999903',
   '11111111-1111-1111-1111-111111111102', NULL,
   'Ube Pandesal Weekend Drop',
   'Back by popular demand — fresh ube pandesal every morning until sold out. Daily 7am–7pm for one week.',
   'Ledesma St, Iloilo City Proper, Iloilo',
   ST_MakePoint(122.5662, 10.7011)::geography,
   'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '2 days', NOW() + INTERVAL '9 days',
   '07:00', '19:00',
   'https://www.facebook.com/floraandflour', NULL,
   'approved', NULL,
   (SELECT id FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL LIMIT 1),
   NOW() - INTERVAL '1 day', 0),

  ('99999999-9999-9999-9999-999999999904',
   '11111111-1111-1111-1111-111111111105', NULL,
   'Farm-to-Table Tasting Night',
   'A five-course tasting built from that morning''s market run, paired with local wines. Limited to 20 guests.',
   'Delgado St, Iloilo City Proper, Iloilo',
   ST_MakePoint(122.5687, 10.6935)::geography,
   'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '5 days 18:30', NOW() + INTERVAL '5 days 21:00',
   NULL, NULL,
   'https://www.instagram.com/lunaandleaf/', 'https://lu.ma/luna-leaf-tasting',
   'approved', NULL,
   (SELECT id FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL LIMIT 1),
   NOW() - INTERVAL '2 days', 0),

  ('99999999-9999-9999-9999-999999999905',
   '11111111-1111-1111-1111-111111111106', NULL,
   'Live Acoustic Friday',
   'Unplugged sets from 7pm on the patio — craft beer, tapas, and zero cover charge.',
   'General Luna St, Iloilo City Proper, Iloilo',
   ST_MakePoint(122.5651, 10.6966)::geography,
   'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '4 days 19:00', NOW() + INTERVAL '4 days 22:30',
   NULL, NULL,
   'https://www.facebook.com/eltapasandbrew', NULL,
   'approved', NULL,
   (SELECT id FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL LIMIT 1),
   NOW() - INTERVAL '2 days', 0),

  ('99999999-9999-9999-9999-999999999906',
   '11111111-1111-1111-1111-111111111107', NULL,
   'Street Food Crawl: La Paz Edition',
   'Guided crawl through the La Paz night market — five stops, ten bites, one very full night.',
   'La Paz Market, Iloilo City',
   ST_MakePoint(122.5158, 10.7256)::geography,
   'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '7 days 18:00', NOW() + INTERVAL '7 days 22:00',
   NULL, NULL,
   'https://www.instagram.com/iloilostreeteats/', 'https://lu.ma/iloilo-street-crawl',
   'approved', NULL,
   (SELECT id FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL LIMIT 1),
   NOW() - INTERVAL '3 days', 0),

  ('99999999-9999-9999-9999-999999999907',
   '11111111-1111-1111-1111-111111111109', NULL,
   'Handloom Pop-Up Market',
   'Hablon weaves, piña, and hand-dyed pieces — meet the weavers, shop the new drop, and try a loom.',
   'Jaro Plaza, Jaro, Iloilo City',
   ST_MakePoint(122.5616, 10.7218)::geography,
   'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '6 days 10:00', NOW() + INTERVAL '6 days 18:00',
   NULL, NULL,
   'https://www.instagram.com/hablonandhue/', NULL,
   'approved', NULL,
   (SELECT id FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL LIMIT 1),
   NOW() - INTERVAL '3 days', 0),

  ('99999999-9999-9999-9999-999999999908',
   '11111111-1111-1111-1111-111111111110', NULL,
   'Children''s Storytime Hour',
   'Free Saturday storytime for ages 3–8 in the kids'' corner, with a coloring table after.',
   'Valeria St, Iloilo City Proper, Iloilo',
   ST_MakePoint(122.5691, 10.6944)::geography,
   'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '8 days 10:30', NOW() + INTERVAL '8 days 11:30',
   NULL, NULL,
   'https://www.facebook.com/pageturnerbooks', NULL,
   'approved', NULL,
   (SELECT id FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL LIMIT 1),
   NOW() - INTERVAL '3 days', 0),

  -- ── approved + promoted product (composite FK: same shop) ──────────────────
  ('99999999-9999-9999-9999-999999999914',
   '11111111-1111-1111-1111-111111111101',
   (SELECT id FROM public.products WHERE business_id = '11111111-1111-1111-1111-111111111101' LIMIT 1),
   'Single-Origin Tasting Flight',
   'Three single-origin coffees side by side with a guided tasting card — the shop''s bestseller, on the table.',
   'Iznart St, Iloilo City Proper, Iloilo',
   ST_MakePoint(122.5642, 10.6956)::geography,
   'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '12 days 15:00', NOW() + INTERVAL '12 days 16:30',
   NULL, NULL,
   'https://www.instagram.com/theartisanroastery/', NULL,
   'approved', NULL,
   (SELECT id FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL LIMIT 1),
   NOW() - INTERVAL '1 day', 2),

  -- ── pending_review (admin review queue) ────────────────────────────────────
  ('99999999-9999-9999-9999-999999999909',
   '11111111-1111-1111-1111-111111111118', NULL,
   'Seafood Night Special',
   'Fresh catch grill platters every Friday in June — sinuglaw, grilled squid, and kinilaw flights.',
   'Molo Plaza, Molo, Iloilo City',
   ST_MakePoint(122.5260, 10.7152)::geography,
   'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '9 days 17:00', NOW() + INTERVAL '9 days 21:00',
   NULL, NULL,
   NULL, NULL,
   'pending_review', NULL, NULL, NULL, 0),

  ('99999999-9999-9999-9999-999999999910',
   '11111111-1111-1111-1111-111111111119', NULL,
   'Beer & BBQ Tasting',
   'Local craft pours paired with smoked ribs and lechon belly — a casual evening at the bay.',
   'Roxas Bay Boardwalk, Roxas City',
   ST_MakePoint(122.7458, 11.5863)::geography,
   'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '11 days 18:00', NOW() + INTERVAL '11 days 21:30',
   NULL, NULL,
   'https://www.instagram.com/roxasbaybrews/', NULL,
   'pending_review', NULL, NULL, NULL, 0),

  ('99999999-9999-9999-9999-999999999911',
   '11111111-1111-1111-1111-111111111120', NULL,
   'Bibingka Night Market Booth',
   'Hot bibingka and puto bumbong booth at the town plaza night market through the weekend.',
   'Kalibo Town Plaza, Kalibo, Aklan',
   ST_MakePoint(122.3647, 11.7068)::geography,
   'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '14 days 18:00', NOW() + INTERVAL '15 days 23:00',
   '18:00', '23:00',
   'https://www.facebook.com/kaliboheritagebakeshop', NULL,
   'pending_review', NULL, NULL, NULL, 0),

  -- ── rejected (with review_note) ────────────────────────────────────────────
  ('99999999-9999-9999-9999-999999999912',
   '11111111-1111-1111-1111-111111111121', NULL,
   'Wellness Weekend Retreat',
   'Two days of yoga, massage, and farm meals at the retreat house.',
   'Bacolod, Negros Occidental',
   ST_MakePoint(122.9800, 10.6713)::geography,
   'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop',
   NOW() + INTERVAL '20 days 09:00', NOW() + INTERVAL '21 days 17:00',
   NULL, NULL,
   NULL, NULL,
   'rejected',
   'Venue capacity not confirmed yet — please re-submit with the retreat house reservation.',
   (SELECT id FROM public.profiles WHERE role = 'admin' AND archived_at IS NULL LIMIT 1),
   NOW() - INTERVAL '1 day', 0),

  -- ── draft (owner-only, not submitted) ──────────────────────────────────────
  ('99999999-9999-9999-9999-999999999913',
   '11111111-1111-1111-1111-111111111103', NULL,
   'DIY Workshop Series',
   'Draft — weekend repair-and-restore workshops at the shop, dates still being confirmed.',
   'Ledesma St, Iloilo City Proper, Iloilo',
   ST_MakePoint(122.5662, 10.7011)::geography,
   NULL,
   NOW() + INTERVAL '30 days 13:00', NOW() + INTERVAL '30 days 16:00',
   NULL, NULL,
   NULL, NULL,
   'draft', NULL, NULL, NULL, 0)
ON CONFLICT (id) DO NOTHING;
