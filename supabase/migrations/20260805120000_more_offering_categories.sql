-- ============================================================
-- Widen the offering-category picker (phase 6 of the taxonomy split)
-- ------------------------------------------------------------
-- `20260801064656` pinned the five seeded categories to their verticals and
-- said out loud what it was leaving undone:
--
--   "Services and Tourism intentionally end up with no vertical-specific
--    categories yet. Inventing them here would be guessing; phase 6 reads the
--    section names owners actually type and turns the recurring ones into real
--    categories."
--
-- This is that pass. The picker's read is "my vertical OR global"
-- (`getCategoriesPaginated`, lib/api/products/productQuery.ts), so before this
-- migration a salon and a tour operator were each offered exactly ONE option —
-- Health & Beauty, the only global row — and an F&B shop two. A picker with one
-- entry is not a choice, it is a required field with a default.
--
-- Counts after this migration (own + global):
--   Food & Beverage    6 + 3 =  9      Services          6 + 3 = 9
--   Retail             7 + 3 = 10      Tourism & Leisure 6 + 3 = 9
--
-- The five original rows are LEFT IN PLACE. `food-beverages` already carries a
-- product, and `categories.id` is an FK target — dropping a row would strand
-- `products.category_id`. They stay as the broad catch-all beside the finer
-- ones.
--
-- Data-only; no schema change, no policy change, no index. Rollback:
--   DELETE FROM public.categories WHERE slug IN (<the slugs below>);
-- (safe only while no product references them — check first.)
-- ============================================================

-- ─────────────────────────── 1. the rows ────────────────────────────────────
-- Inserted GLOBAL (business_type_id NULL) and pinned in step 2, so a failure to
-- resolve a vertical leaves the category visible everywhere rather than
-- invisible — the same fail-open shape as 20260801064656.
INSERT INTO public.categories (name, slug, description) VALUES
  -- Food & Beverage
  ('Meals & Rice Dishes',     'meals-rice-dishes',      'Full meals, silog, rice bowls, and viands'),
  ('Snacks & Street Food',    'snacks-street-food',     'Merienda, finger food, and quick street eats'),
  ('Drinks & Beverages',      'drinks-beverages',       'Coffee, tea, juices, shakes, and bottled drinks'),
  ('Bakery & Pastries',       'bakery-pastries',        'Bread, cakes, pastries, and baked goods'),
  ('Pasalubong & Delicacies', 'pasalubong-delicacies',  'Local delicacies and take-home treats'),
  -- Retail
  ('Groceries & Essentials',  'groceries-essentials',   'Daily essentials, fresh produce, and household staples'),
  ('Handicrafts & Souvenirs', 'handicrafts-souvenirs',  'Locally made crafts, woven goods, and keepsakes'),
  ('Books & Stationery',      'books-stationery',       'Books, magazines, school and office supplies'),
  ('Toys & Hobbies',          'toys-hobbies',           'Toys, games, collectibles, and hobby supplies'),
  -- Services
  ('Hair & Grooming',         'hair-grooming',          'Haircuts, colouring, shaves, and styling'),
  ('Spa & Massage',           'spa-massage',            'Massage, body treatments, and relaxation services'),
  ('Nails & Lashes',          'nails-lashes',           'Manicure, pedicure, nail art, lashes, and brows'),
  ('Fitness & Classes',       'fitness-classes',        'Gym sessions, personal training, and group classes'),
  ('Repairs & Maintenance',   'repairs-maintenance',    'Electronics, appliance, tailoring, and general repair'),
  ('Laundry & Cleaning',      'laundry-cleaning',       'Laundry, dry cleaning, and cleaning services'),
  -- Tourism & Leisure
  ('Rooms & Stays',           'rooms-stays',            'Overnight rooms, dorm beds, and whole-place stays'),
  ('Tours & Day Trips',       'tours-day-trips',        'Guided tours, island hopping, and day excursions'),
  ('Workshops & Experiences', 'workshops-experiences',  'Classes, cultural workshops, and hands-on experiences'),
  ('Vehicle Rental',          'vehicle-rental',         'Vans, cars, motorbikes, and bicycles for hire'),
  ('Event Spaces',            'event-spaces',           'Function rooms, venues, and event packages'),
  ('Tickets & Entry',         'tickets-entry',          'Admission, passes, and entry tickets'),
  -- Global (NULL vertical — offered to every shop)
  ('Gift Sets & Bundles',     'gift-sets-bundles',      'Curated bundles, hampers, and gift packages'),
  ('Other',                   'other',                  'Anything that does not fit the categories above')
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────── 2. pin each to its vertical ─────────────────────────
-- Matched on the admin-editable business-type NAME, like the 20260801064656
-- backfill: a rename on cloud simply means no match and the category stays
-- global.
--
-- ⚠️ On a FRESH database every one of these matches ZERO rows —
-- `business_types` are created by the SEED, which runs AFTER migrations. The
-- same mapping is repeated (COALESCE'd) in `supabase/seeds/business_categories.sql`
-- for exactly that reason. Do not delete one copy believing the other covers it.
UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Food & Beverage'
  AND c.slug IN (
    'meals-rice-dishes', 'snacks-street-food', 'drinks-beverages',
    'bakery-pastries', 'pasalubong-delicacies')
  AND c.business_type_id IS NULL;

UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Retail'
  AND c.slug IN (
    'groceries-essentials', 'handicrafts-souvenirs', 'books-stationery',
    'toys-hobbies')
  AND c.business_type_id IS NULL;

UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Services'
  AND c.slug IN (
    'hair-grooming', 'spa-massage', 'nails-lashes', 'fitness-classes',
    'repairs-maintenance', 'laundry-cleaning')
  AND c.business_type_id IS NULL;

UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Tourism & Leisure'
  AND c.slug IN (
    'rooms-stays', 'tours-day-trips', 'workshops-experiences',
    'vehicle-rental', 'event-spaces', 'tickets-entry')
  AND c.business_type_id IS NULL;

-- 'gift-sets-bundles' and 'other' are deliberately NOT pinned. A gift bundle is
-- as plausible from a bakery as from a souvenir shop, and 'Other' has to exist
-- in every picker or an owner with an unlisted offering has nowhere to put it —
-- the same reasoning that left Health & Beauty global.
