-- Atomic coupon redemption counter increment.
-- Replaces the application-level read-modify-write that loses increments under
-- concurrent redemptions. Returns TRUE if the counter was incremented, FALSE if
-- the global cap was already reached (guards against the race between the
-- application-level cap check and the actual insert).
--
-- Rollback: DROP FUNCTION increment_coupon_redemptions(uuid);

-- SECURITY DEFINER is required: authenticated users have no UPDATE policy on coupons,
-- so SECURITY INVOKER silently returns false (0 rows updated) for every consumer call.
CREATE OR REPLACE FUNCTION increment_coupon_redemptions(p_coupon_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE coupons
  SET current_redemptions = current_redemptions + 1
  WHERE id = p_coupon_id
    AND (
      max_redemptions_global IS NULL
      OR current_redemptions < max_redemptions_global
    );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;
