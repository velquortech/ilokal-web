-- Coupon-redemption notifications: notify the business owner when a customer
-- redeems one of their coupons/deals.
--
-- Redemptions are created by the mobile redeem route using the customer's
-- RLS-scoped client, so the existing create_notification RPC (authorizes caller
-- as admin OR recipient) can't be reused here — caller = customer, recipient =
-- owner. This adds a dedicated SECURITY DEFINER RPC that authorizes the caller
-- as the OWNER OF THE REDEMPTION ROW and inserts a notification for the business
-- owner, carrying the customer's name, the coupon, and the branch.
--
-- Rollback:
--   DROP FUNCTION notify_coupon_redemption(uuid);
--   ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
--   ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
--     CHECK (type IN ('business_document_approved','business_document_rejected',
--                     'business_verified','business_rejected','system'));

-- 1. Widen the type CHECK to allow the new notification type.
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'business_document_approved',
    'business_document_rejected',
    'business_verified',
    'business_rejected',
    'system',
    'coupon_redeemed'
  ));

-- 2. RPC: emit a coupon_redeemed notification for a redemption's business owner.
-- Authorizes the caller as the customer who made the redemption, then inserts a
-- notification for the owner with elevated rights (authenticated users have no
-- INSERT policy on notifications). Returns the new notification id, or NULL if it
-- could not be created — a notification failure must never break redemption.
CREATE OR REPLACE FUNCTION notify_coupon_redemption(p_redemption_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_coupon_id   uuid;
  v_branch_id   uuid;
  v_owner_id    uuid;
  v_business_id uuid;
  v_code        text;
  v_description text;
  v_redeemer    text;
  v_branch_name text;
  v_label       text;
  v_body        text;
  v_id          uuid;
BEGIN
  -- Load the redemption.
  SELECT ur.user_id, ur.coupon_id, ur.branch_id
    INTO v_user_id, v_coupon_id, v_branch_id
  FROM user_redemptions ur
  WHERE ur.id = p_redemption_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Authorize: only the customer who made the redemption may trigger its
  -- notification (the route calls this with that customer's RLS-scoped client).
  IF v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized to notify for this redemption';
  END IF;

  -- Coupon → business owner.
  SELECT c.code, c.description, c.business_id, b.owner_id
    INTO v_code, v_description, v_business_id, v_owner_id
  FROM coupons c
  JOIN businesses b ON b.id = c.business_id
  WHERE c.id = v_coupon_id;

  IF v_owner_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Customer display name + branch name.
  SELECT COALESCE(NULLIF(p.full_name, ''), p.email, 'A customer')
    INTO v_redeemer
  FROM profiles p
  WHERE p.id = v_user_id;

  SELECT br.name INTO v_branch_name FROM branches br WHERE br.id = v_branch_id;

  v_label := COALESCE(NULLIF(v_code, ''), NULLIF(v_description, ''), 'a coupon');
  v_body  := COALESCE(v_redeemer, 'A customer') || ' redeemed "' || v_label || '"'
             || CASE WHEN v_branch_name IS NOT NULL
                     THEN ' at ' || v_branch_name ELSE '' END;

  INSERT INTO notifications (
    user_id, type, title, body, business_id, actor_id, metadata
  )
  VALUES (
    v_owner_id,
    'coupon_redeemed',
    'Coupon redeemed',
    v_body,
    v_business_id,
    v_user_id,
    jsonb_build_object(
      'redemption_id', p_redemption_id,
      'redeemer_id',   v_user_id,
      'redeemer_name', v_redeemer,
      'coupon_code',   v_code,
      'branch_id',     v_branch_id,
      'branch_name',   v_branch_name
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Swallow any failure: a missing branch, a deleted profile, etc. must not
    -- roll back the customer's redemption.
    RETURN NULL;
END;
$$;

-- Only authenticated users may attempt it; the body re-checks ownership.
REVOKE ALL ON FUNCTION notify_coupon_redemption(uuid) FROM public;
GRANT EXECUTE ON FUNCTION notify_coupon_redemption(uuid) TO authenticated;
