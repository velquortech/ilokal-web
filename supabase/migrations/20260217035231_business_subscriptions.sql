-- 1. Business Subscriptions Table
CREATE TABLE public.business_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  
  status public.sub_status DEFAULT 'active',
  
  -- The core timing logic
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Policies
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

-- Admins can view ALL subscriptions (For tracking)
CREATE POLICY "Admins view all subscriptions" 
ON public.business_subscriptions FOR SELECT 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Business Owners view THEIR OWN subscription
CREATE POLICY "Owners view own subscription" 
ON public.business_subscriptions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = business_subscriptions.business_id 
    AND owner_id = auth.uid()
  )
);

-- 3. Trigger for Updated At
CREATE TRIGGER on_update_subscriptions
BEFORE UPDATE ON public.business_subscriptions
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
