-- ============================================================
-- Retail trades: auto supply, hardware, agrivet, pharmacy, pet, sports
-- ------------------------------------------------------------
-- An auto supply shop could not describe itself OR categorize a single
-- product, because it is missing from BOTH taxonomies:
--
--   business_categories  the SHOP type, picked once at registration and stored
--                        on `businesses.category_id`. Retail had 4 rows —
--                        Bookstore, Clothing, Grocery, Specialty Shop — so an
--                        auto supply store registered as "Specialty Shop",
--                        which is also what the explore filter groups it under.
--   categories           the OFFERING type, picked per product. Retail had 7
--                        after 20260805120000, none covering parts or oils.
--
-- This migration fills both. Data-only: no table, column, policy or index
-- change.
--
-- Rollback:
--   DELETE FROM public.categories WHERE slug IN (<the slugs in step 1>);
--   DELETE FROM public.business_categories WHERE name IN (<the names in step 3>);
-- Safe only while nothing references them — `businesses.category_id` and
-- `products.category_id` are both FKs. Check before deleting.
-- ============================================================

-- ─────────────── 1. offering categories (Add Product picker) ────────────────
-- Inserted GLOBAL and pinned in step 2, so a vertical that fails to resolve
-- leaves the category visible everywhere rather than nowhere — the fail-open
-- shape 20260801064656 established.
INSERT INTO public.categories (name, slug, description) VALUES
  ('Auto & Motor Parts',      'auto-motor-parts',      'Car and motorcycle parts, oils, batteries, tires, and accessories'),
  ('Hardware & Construction', 'hardware-construction', 'Tools, paint, plumbing, electrical, and building materials'),
  ('Agri & Pet Supplies',     'agri-pet-supplies',     'Feeds, fertilizer, veterinary meds, pet food, and pet care'),
  ('Medicine & Pharmacy',     'medicine-pharmacy',     'Over-the-counter medicine, first aid, and medical supplies'),
  ('Sports & Outdoor',        'sports-outdoor',        'Sportswear, equipment, camping, and outdoor gear'),
  ('Bags & Footwear',         'bags-footwear',         'Shoes, sandals, bags, and luggage'),
  ('Baby & Kids',             'baby-kids',             'Baby care, childrenswear, and nursery essentials'),
  ('Jewelry & Accessories',   'jewelry-accessories',   'Jewelry, watches, eyewear, and personal accessories'),
  ('Plants & Garden',         'plants-garden',         'Plants, seeds, pots, soil, and gardening tools')
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────── 2. pin them to Retail ───────────────────────────────
-- ⚠️ Matches ZERO rows on a fresh database — `business_types` are created by
-- the SEED, which runs AFTER migrations. The same mapping is repeated
-- (COALESCE'd) in `supabase/seeds/business_categories.sql`. Do not delete one
-- copy believing the other covers it.
UPDATE public.categories c
SET business_type_id = bt.id
FROM public.business_types bt
WHERE bt.name = 'Retail'
  AND c.slug IN (
    'auto-motor-parts', 'hardware-construction', 'agri-pet-supplies',
    'medicine-pharmacy', 'sports-outdoor', 'bags-footwear', 'baby-kids',
    'jewelry-accessories', 'plants-garden')
  AND c.business_type_id IS NULL;

-- ─────────────── 3. shop types (registration category step) ─────────────────
-- Three constraints shape this block, none of them optional:
--
-- (a) `business_categories` has NO UNIQUE on `name`, so `ON CONFLICT (name)`
--     is unavailable. Idempotency is a per-row `WHERE NOT EXISTS` — the same
--     shape `seeds/subscription_plans.sql` was rewritten to after a plain
--     INSERT silently added four duplicate plans on every re-run.
--
-- (b) The seed's retail block is wrapped in
--     `IF NOT EXISTS (SELECT 1 FROM business_categories WHERE business_type_id
--     = retail_id)`, so appending rows THERE is a no-op on every database that
--     already has retail categories — which is all of them. These rows have to
--     come from here (and are mirrored into the seed as their own guarded
--     block, for a fresh database).
--
-- (c) `image_url` is nullable in the schema, but the registration step renders
--     `<Image src={item.imageURL} />` with no fallback and types it `string`
--     (`app/business/registration/steps/ShopCategoryStep.tsx`). A NULL here
--     CRASHES the step. Every row below therefore carries an image.
--
-- (d) The host must be on `imageRemotePatterns` in next.config.ts AND must not
--     REDIRECT off it. `buildImgSrc` derives the CSP img-src list from that
--     array, and CSP re-checks every redirect hop — so an allowlisted host that
--     302s somewhere unlisted still renders broken. That is not theoretical:
--     the first cut of this block used `picsum.photos`, which IS allowlisted
--     but answers 302 to `https://fastly.picsum.photos`, which is not, and all
--     six tiles came up as alt text. `curl` says 200 (it follows redirects) and
--     the CSP header looks right, so the only symptom is the broken picture.
--     Dev-only, too, because the production branch of `buildImgSrc` pushes a
--     bare `https:` — it would have passed a production smoke.
--
--     `images.unsplash.com` serves 200 directly with no redirect, which is why
--     every row here (and the other ten shop types) uses it.
--
-- The `h=1200` in each URL is load-bearing, not decoration. The card renders the
-- image into a fixed `h-36`/`h-52` box with no `object-cover`, so it is
-- TOP-CROPPED — a portrait source shows its ceiling and nothing else. Forcing a
-- 4:3 crop at the CDN makes what lands in the box predictable. Two of these six
-- sources are portrait.
--
-- Photos were chosen by eye, not by alt text, and picked to match the ten
-- existing tiles: a real shop interior or storefront, no legible brand name (a
-- named chain on a category tile implies an affiliation that does not exist),
-- and no flat-lay product shot.
INSERT INTO public.business_categories (business_type_id, name, description, image_url)
SELECT bt.id, v.name, v.description, v.image_url
FROM public.business_types bt
CROSS JOIN (VALUES
  ('Auto Supply / Motor Parts',
   'Shops selling car and motorcycle parts, oils, batteries, and accessories.',
   'https://images.unsplash.com/photo-1777213003360-0419fd2fbfdf?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Hardware / Construction Supply',
   'Tools, paint, plumbing, electrical, and building materials.',
   'https://images.unsplash.com/photo-1759200165738-6366977a73c6?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Agrivet / Farm Supply',
   'Feeds, fertilizer, seeds, and veterinary supplies for farms and pets.',
   'https://images.unsplash.com/photo-1756158450046-24e51d854f71?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Pharmacy / Drugstore',
   'Over-the-counter medicine, first aid, and everyday medical supplies.',
   'https://images.unsplash.com/photo-1580281657529-557a6abb6387?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Pet Shop',
   'Pet food, grooming supplies, accessories, and small animal care.',
   'https://images.unsplash.com/photo-1516453734593-8d198ae84bcf?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Sports & Outdoor Shop',
   'Sportswear, equipment, camping gear, and outdoor supplies.',
   'https://images.unsplash.com/photo-1768145488772-db787036bb13?q=80&w=1600&h=1200&fit=crop&auto=format')
) AS v(name, description, image_url)
WHERE bt.name = 'Retail'
  AND NOT EXISTS (
    SELECT 1 FROM public.business_categories existing
     WHERE existing.name = v.name
  );
