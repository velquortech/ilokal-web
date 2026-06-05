-- Rename the social "follows" table out of the billing namespace.
--
-- `public.subscriptions` was the mobile user → business *follow* link, but its
-- bare name collided with the billing tables `subscription_plans` and
-- `business_subscriptions`, reading as their parent rather than an unrelated
-- social relation. Rename it to `follows` for clarity.
--
-- Dependent views (business analytics `total_followers`, analytics security
-- views) and RLS policies bind to the table OID, so they follow the rename
-- automatically — no view recreation needed.

ALTER TABLE public.subscriptions RENAME TO follows;

-- Keep policy names in sync with the table (cosmetic; policies stay attached).
ALTER POLICY "Users manage own subscriptions" ON public.follows
  RENAME TO "Users manage own follows";
ALTER POLICY "Admins manage all subscriptions" ON public.follows
  RENAME TO "Admins manage all follows";

COMMENT ON TABLE public.follows IS
  'Mobile user → business follows (social). Distinct from the billing tables subscription_plans / business_subscriptions.';
