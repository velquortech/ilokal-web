-- Rename coupons.requires_subscription → requires_follow.
--
-- The gate checks the `follows` table (a user must follow the business to claim),
-- so "subscription" was a misnomer left over from the old table name. Behaviour
-- is unchanged; this only realigns the column name with what it gates on.

ALTER TABLE public.coupons
  RENAME COLUMN requires_subscription TO requires_follow;
