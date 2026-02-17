-- 1. Payments Table
CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.business_subscriptions(id) ON DELETE SET NULL,
  
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'PHP',
  status public.payment_status DEFAULT 'pending',
  provider_payment_id TEXT, -- e.g., Stripe ID, GCash Reference Number
  payment_method TEXT, -- 'credit_card', 'gcash', 'maya'
  
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admins see ALL payments (Requirement: "Admin can track payments")
CREATE POLICY "Admins view all payments" 
ON public.payments FOR SELECT 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Business Owners see THEIR OWN payment history
CREATE POLICY "Owners view own payments" 
ON public.payments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = payments.business_id 
    AND owner_id = auth.uid()
  )
);
