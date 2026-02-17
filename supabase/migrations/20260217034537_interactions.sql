-- 1. Redemptions (Transactions)
CREATE TABLE public.user_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  coupon_id UUID REFERENCES public.coupons(id),
  branch_id UUID REFERENCES public.branches(id), 
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, 
  is_claimed BOOLEAN DEFAULT FALSE 
);

-- 2. Subscriptions (Follows)
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  business_id UUID REFERENCES public.businesses(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id) -- Prevent duplicate follows
);

-- 3. RLS
ALTER TABLE public.user_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can see/create their OWN redemptions/subs
CREATE POLICY "Users manage own interactions" 
ON public.user_redemptions FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users manage own subscriptions" 
ON public.subscriptions FOR ALL 
USING (auth.uid() = user_id);

-- Business Owners can VIEW who redeemed their coupons
CREATE POLICY "Owners view redemptions for their coupons" 
ON public.user_redemptions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.coupons c
    JOIN public.businesses b ON c.business_id = b.id
    WHERE c.id = user_redemptions.coupon_id AND b.owner_id = auth.uid()
  )
);
