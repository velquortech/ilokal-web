-- Bida of the Day — editorial daily picks for the hero's leading slide.
--
-- The seeds insert these so the local board demos the phase-2 hero variant:
-- the leading slide reads "BIDA OF THE DAY" and leads the rotation. Picks are
-- resolved by product id (business id follows), so no business ids hardcode.
--
--   today          Live Music Night Entry — The Lampara Live Music Bar
--                  (the launch-week product at an established business from
--                  the widened fresh tier — a new arrival starred)
--   yesterday      Clothing Alteration — FixRight Repair Hub (grid #1)
--   2 days ago     Artisan Service 10 — Northern Studio (grid #2)
--
-- Depends on: businesses.sql + products.sql + the bida_of_the_day migration.
-- Idempotent — ON CONFLICT (pick_date) makes re-running a no-op; a later
-- "today" row re-stamps the daily pick by simply re-seeding after the date
-- rolls over (or the table is cleared for a fresh demo).

INSERT INTO public.bida_of_the_day (pick_date, business_id, product_id, note)
SELECT CURRENT_DATE,
       p.business_id,
       p.id,
       'Launch-week star at an established bar — today''s Bida Ngayon pick'
FROM public.products p
WHERE p.id = '33333333-3333-3333-3333-333333333366'
ON CONFLICT (pick_date) DO NOTHING;

INSERT INTO public.bida_of_the_day (pick_date, business_id, product_id, note)
SELECT CURRENT_DATE - 1,
       p.business_id,
       p.id,
       'Board topper — yesterday''s Bida Ngayon pick'
FROM public.products p
WHERE p.id = '33333333-3333-3333-3333-333333333357'
ON CONFLICT (pick_date) DO NOTHING;

INSERT INTO public.bida_of_the_day (pick_date, business_id, product_id, note)
SELECT CURRENT_DATE - 2,
       p.business_id,
       p.id,
       'Strong runner-up — the day before'
FROM public.products p
WHERE p.id = 'f1000000-0000-0000-0000-000000000810'
ON CONFLICT (pick_date) DO NOTHING;
