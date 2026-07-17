-- Security hardening: pin search_path on the remaining trigger/helper functions
-- flagged by the Supabase security advisor (function_search_path_mutable).
-- None are SECURITY DEFINER, but pinning removes the schema-shadowing surface
-- entirely and clears the lint. Behaviour unchanged.
--
-- Rollback: ALTER FUNCTION ... RESET search_path; for each.

ALTER FUNCTION public.gen_redemption_code()       SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_updated_at()         SET search_path = public, pg_temp;
ALTER FUNCTION public.set_redemption_code()       SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_product_availability() SET search_path = public, pg_temp;
