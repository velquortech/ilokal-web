-- Enforce one rating per user per product.
-- Required for the upsert onConflict: 'user_id,product_id' in the mobile ratings route.
ALTER TABLE public.ratings
  ADD CONSTRAINT ratings_user_product_unique UNIQUE (user_id, product_id);
