-- ─── Seed test data for plans feature ─────────────────────
-- References existing auth.users and businesses rows in the
-- local Supabase stack. Safe to re-run (idempotent via
-- ON CONFLICT DO NOTHING).

-- Upcoming plan for the first user
INSERT INTO plans (id, user_id, title, target_date)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'c171d8a2-22f1-444a-b06a-d1b2789cb072',
  'Anniversary Dinner',
  CURRENT_DATE + INTERVAL '7 days'
) ON CONFLICT DO NOTHING;

-- Past plan for the first user
INSERT INTO plans (id, user_id, title, target_date)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'c171d8a2-22f1-444a-b06a-d1b2789cb072',
  'Saturday Food Crawl',
  CURRENT_DATE - INTERVAL '3 days'
) ON CONFLICT DO NOTHING;

-- Upcoming plan for the second user
INSERT INTO plans (id, user_id, title, target_date)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'daacb816-3241-44e7-b88b-a44355887b47',
  'Cafe Hop Weekend',
  CURRENT_DATE + INTERVAL '14 days'
) ON CONFLICT DO NOTHING;

-- Stops for the Anniversary Dinner (upcoming)
INSERT INTO plan_stops (id, plan_id, business_id, stop_time, position)
VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111106',
   '18:00', 0),
  ('b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111109',
   '20:30', 1)
ON CONFLICT DO NOTHING;

-- Stops for the Saturday Food Crawl (past)
INSERT INTO plan_stops (id, plan_id, business_id, stop_time, position)
VALUES
  ('b0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111108',
   '10:00', 0),
  ('b0000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111110',
   '12:00', 1),
  ('b0000000-0000-0000-0000-000000000005',
   'a0000000-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111114',
   '14:30', 2)
ON CONFLICT DO NOTHING;

-- Stops for Cafe Hop Weekend (upcoming, second user)
INSERT INTO plan_stops (id, plan_id, business_id, stop_time, position)
VALUES
  ('b0000000-0000-0000-0000-000000000006',
   'a0000000-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111106',
   NULL, 0),
  ('b0000000-0000-0000-0000-000000000007',
   'a0000000-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111109',
   NULL, 1)
ON CONFLICT DO NOTHING;
