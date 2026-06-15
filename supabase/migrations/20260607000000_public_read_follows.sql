-- Public read for follows so follower COUNTs aren't zeroed by RLS.
--
-- `public.follows` only had owner/admin policies (a user sees their own follows;
-- admins see all). The mobile follower badge — and the /mobile/businesses/nearby
-- + /mobile/businesses/:id endpoints that feed it — read this table as the anon
-- role to COUNT followers per business. Under RLS that count silently returned 0.
--
-- Mirror `business_ratings`' "Public ratings are viewable by everyone" policy:
-- the follow graph is no more sensitive than the (already public) ratings/reviews
-- that expose user_id + comment. Counting is read-only; writes stay owner-scoped.

CREATE POLICY "Public follows are viewable by everyone"
ON public.follows FOR SELECT
USING (true);
