-- 1. Create the Function
CREATE OR REPLACE FUNCTION grant_beta_on_verification()
RETURNS TRIGGER AS $$
DECLARE
  beta_plan_id UUID;
BEGIN
  -- Only run if status changed TO 'verified'
  IF NEW.status = 'verified' AND (OLD.status IS DISTINCT FROM 'verified') THEN
    
    -- Find the Beta Plan ID
    SELECT id INTO beta_plan_id FROM public.subscription_plans WHERE name = 'Beta Access' LIMIT 1;
    
    IF beta_plan_id IS NOT NULL THEN
      -- Create the subscription automatically
      INSERT INTO public.business_subscriptions (
        business_id, 
        plan_id, 
        current_period_start, 
        current_period_end, 
        status
      ) VALUES (
        NEW.id,
        beta_plan_id,
        NOW(),
        NOW() + INTERVAL '3 months', -- Hardcoded 3 months rule
        'active'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach Trigger to Businesses Table
CREATE TRIGGER trigger_grant_beta
AFTER UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION grant_beta_on_verification();
