-- 1. Enums for Billing
CREATE TYPE public.plan_interval AS ENUM ('month', 'year', 'one_time');
CREATE TYPE public.sub_status AS ENUM ('active', 'canceled', 'expired', 'past_due');
CREATE TYPE public.payment_status AS ENUM ('succeeded', 'pending', 'failed', 'refunded');

-- 2. Subscription Plans Table
-- Defines what "products" the businesses can buy.
CREATE TABLE public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- e.g., 'Starter', 'Pro', 'Beta Access'
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  interval public.plan_interval NOT NULL, 
  interval_count INT DEFAULT 1, -- e.g., 1 month, 3 months
  is_active BOOLEAN DEFAULT TRUE, -- Soft delete for old plans
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS for Plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view available plans
CREATE POLICY "Public view active plans" 
ON public.subscription_plans FOR SELECT 
USING (is_active = TRUE);

-- Only Admins can edit plans
CREATE POLICY "Admins manage plans" 
ON public.subscription_plans FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
