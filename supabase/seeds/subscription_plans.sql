-- 3. Seed Initial Plans (As per your requirements)
-- This automatically inserts the required plans when you run this migration.
INSERT INTO public.subscription_plans (name, description, price, interval, interval_count) VALUES
  ('Free Tier', 'One-time trial for new businesses', 0, 'month', 1),
  ('Beta Access', 'Exclusive access for verified businesses', 0, 'month', 3),
  ('Pro Monthly', 'Standard monthly subscription', 999.00, 'month', 1),
  ('Pro Yearly', 'Discounted yearly subscription', 9999.00, 'year', 1);
