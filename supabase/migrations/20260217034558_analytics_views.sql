CREATE OR REPLACE VIEW business_dashboard_stats AS
SELECT 
  b.id as business_id,
  b.name as business_name,
  
  -- Metric: Total Followers
  (SELECT COUNT(*) FROM public.subscriptions s WHERE s.business_id = b.id) as total_followers,
  
  -- Metric: Total Redemptions (All time)
  (SELECT COUNT(*) 
   FROM public.user_redemptions ur 
   JOIN public.coupons c ON ur.coupon_id = c.id 
   WHERE c.business_id = b.id) as total_redemptions,

  -- Metric: Active Deals Count
  (SELECT COUNT(*) FROM public.coupons c 
   WHERE c.business_id = b.id AND c.end_date > NOW()) as active_deals

FROM public.businesses b;
