CREATE OR REPLACE VIEW admin_revenue_analytics AS
SELECT 
  -- Group by Month
  DATE_TRUNC('month', p.payment_date) as month,
  
  -- Total Revenue
  SUM(amount) FILTER (WHERE p.status = 'succeeded') as total_revenue,
  
  -- Count of Payments by Plan Type
  COUNT(*) FILTER (WHERE p.status = 'succeeded') as successful_payments,
  COUNT(*) FILTER (WHERE p.status = 'failed') as failed_payments,
  
  -- Breakdown by Plan (using JSON for flexibility in frontend)
  json_object_agg(sp.name, amount) as revenue_by_plan_breakdown

FROM public.payments p
JOIN public.business_subscriptions bs ON p.subscription_id = bs.id
JOIN public.subscription_plans sp ON bs.plan_id = sp.id
GROUP BY month
ORDER BY month DESC;
