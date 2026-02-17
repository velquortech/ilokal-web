-- ==========================================
-- 1. COUPONS: Time Travel Prevention
-- ==========================================
-- Logic: A coupon cannot expire before it starts.
ALTER TABLE public.coupons
ADD CONSTRAINT check_dates_order 
CHECK (end_date > start_date);

-- Logic: The countdown timer for redemption must be at least 1 minute.
ALTER TABLE public.coupons
ADD CONSTRAINT check_positive_timer 
CHECK (redeem_time_limit_minutes > 0);


-- ==========================================
-- 2. PRODUCTS: Financial Safety
-- ==========================================
-- Logic: You cannot pay a customer to take a product (Price cannot be negative).
-- Note: We allow 0 for "Free" items, but not -100.
ALTER TABLE public.products
ADD CONSTRAINT check_product_price_non_negative 
CHECK (price >= 0);


-- ==========================================
-- 3. PAYMENTS: Anti-Fraud
-- ==========================================
-- Logic: A payment transaction must be for a positive amount.
-- (Refunds are usually handled in a separate 'refunds' table or with a negative sign, 
-- but for a 'payments' ledger, strictly positive is safer to start).
ALTER TABLE public.payments
ADD CONSTRAINT check_payment_amount_positive 
CHECK (amount > 0);


-- ==========================================
-- 4. SUBSCRIPTIONS: Validity Check
-- ==========================================
-- Logic: A subscription plan (like "Pro Tier") cannot cost less than 0.
ALTER TABLE public.subscription_plans
ADD CONSTRAINT check_plan_price_non_negative 
CHECK (price >= 0);

-- Logic: A business subscription period must end AFTER it starts.
ALTER TABLE public.business_subscriptions
ADD CONSTRAINT check_sub_period_valid 
CHECK (current_period_end > current_period_start);


-- ==========================================
-- 5. PROFILES: Data Hygiene
-- ==========================================
-- Logic: Basic Email Validation (Regex).
-- This ensures no one saves "john.doe" without the "@gmail.com" part.
ALTER TABLE public.profiles
ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$');

-- Logic: PH Phone Number Validation.
-- Enforces that phone numbers roughly match standard formats (digits, maybe a + sign).
-- This regex allows "+639..." or "09..." formats.
ALTER TABLE public.profiles
ADD CONSTRAINT check_phone_format 
CHECK (phone_number ~ '^\+?[0-9]{10,15}$');
