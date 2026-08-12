-- ============================================================
-- Broaden the shop-type taxonomy: Food, Retail, Services
-- ------------------------------------------------------------
-- The registration picker (and the Explore filter) only offered a handful of
-- shop types per vertical — a carinderia, an electronics store, a laundromat
-- or a pawnshop had to file itself under a nearest-match category like
-- "Specialty Shop" or "Repair Services". This adds a broad set of the shop
-- types owners actually are, so a shop can describe itself accurately.
--
--   business_categories  the SHOP type, picked once at registration and stored
--                        on `businesses.category_id`.
--
-- Tourism & Leisure is deliberately EXCLUDED: its booking flow is on hold, so
-- its categories stay as-is (Bed & Breakfast, Cultural Experience,
-- Entertainment Venue) until that work resumes.
--
-- Data-only: no table, column, policy or index change.
--
-- Rollback:
--   DELETE FROM public.business_categories
--    WHERE name IN (<the names below>);
-- Safe only while nothing references them — `businesses.category_id` is an FK.
-- Check before deleting.
-- ============================================================

-- ─────────────── shop types (registration category step) ────────────────────
-- Same constraints as 20260805130000 / 20260807000000; read those headers
-- before editing this block. In short:
--
-- (a) `business_categories` has NO UNIQUE on `name`, so `ON CONFLICT (name)` is
--     unavailable — idempotency is a per-row `WHERE NOT EXISTS`.
-- (b) The seed's per-vertical blocks are wrapped in
--     `IF NOT EXISTS (… WHERE business_type_id = <vertical>)`, so appending
--     rows THERE is a no-op on every database that has ever been seeded. These
--     rows come from here, mirrored into the seed as their own unguarded block.
-- (c) `image_url` is nullable in the schema but the registration step renders
--     `<Image src={item.imageURL} />` with no fallback and types it `string` —
--     a NULL CRASHES the step. Every row carries an image.
-- (d) `images.unsplash.com` only. A host must be on `imageRemotePatterns` AND
--     must not REDIRECT off it, because CSP re-checks every hop (picsum is
--     allowlisted and 302s to fastly.picsum.photos, which is not — six tiles
--     shipped broken that way, dev-only). All URLs below were fetched as
--     stored: 200, zero redirects.
--
-- `h=1200` forces a 4:3 crop at the CDN: the card renders into a fixed
-- `h-36`/`h-52` box with no `object-cover`, so it TOP-CROPS and a portrait
-- source would show only its ceiling.
INSERT INTO public.business_categories (business_type_id, name, description, image_url)
SELECT bt.id, v.name, v.description, v.image_url
FROM public.business_types bt
JOIN (VALUES
  -- ─────────────────────────── Food & Beverage ───────────────────────────
  ('Food & Beverage', 'Carinderia / Eatery',
   'Budget-friendly home-style meals served daily, from silog to viands.',
   'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Food & Beverage', 'Fast Food / Food Cart',
   'Quick, affordable meals and snacks served on the go.',
   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Food & Beverage', 'Dessert / Ice Cream Parlor',
   'Ice cream, cakes, and sweet treats.',
   'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Food & Beverage', 'Milk Tea / Refreshments',
   'Milk tea, fruit teas, shakes, and cold drinks.',
   'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Food & Beverage', 'Roast / Lechon House',
   'Roasted meats, lechon, and grilled specialties.',
   'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Food & Beverage', 'Catering Service',
   'Food service for events, parties, and gatherings.',
   'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Food & Beverage', 'Seafood / Grill House',
   'Fresh seafood and grilled dishes.',
   'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=1600&h=1200&fit=crop&auto=format'),
  -- ─────────────────────────────── Retail ────────────────────────────────
  ('Retail', 'Electronics / Gadgets',
   'Appliances, gadgets, and consumer electronics.',
   'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Cellphone / Load Store',
   'Mobile phones, accessories, and load / e-loading.',
   'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Furniture / Home Goods',
   'Furniture, home décor, and household items.',
   'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Beauty / Cosmetics',
   'Makeup, skincare, and personal care products.',
   'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Optical / Eyewear',
   'Eyeglasses, contact lenses, and vision care.',
   'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Jewelry / Accessories',
   'Jewelry, watches, and fashion accessories.',
   'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Bags / Footwear',
   'Bags, shoes, and footwear.',
   'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Baby / Kids Store',
   'Baby care, childrenswear, and nursery essentials.',
   'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Toys / Hobbies',
   'Toys, games, and hobby supplies.',
   'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Plants / Garden / Flower Shop',
   'Plants, flowers, and garden supplies.',
   'https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Souvenir / Pasalubong / Handicrafts',
   'Local crafts, souvenirs, and take-home gifts.',
   'https://images.unsplash.com/photo-1528458909336-e7a0adfed0a5?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Sari-sari / Mini-Mart',
   'Neighborhood variety and convenience store.',
   'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Rice / Grains Dealer',
   'Rice, grains, and agricultural produce.',
   'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Thrift / Ukay-ukay',
   'Second-hand and pre-loved clothing.',
   'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Retail', 'Bike Shop',
   'Bicycles, parts, and accessories.',
   'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1600&h=1200&fit=crop&auto=format'),
  -- ────────────────────────────── Services ───────────────────────────────
  ('Services', 'Laundry / Dry Cleaning',
   'Wash, dry, and iron services.',
   'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Nail / Lash Studio',
   'Manicure, pedicure, nail art, lashes, and brows.',
   'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Massage / Reflexology',
   'Massage, reflexology, and body treatments.',
   'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Tailoring / Alterations',
   'Custom sewing, alterations, and dressmaking.',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Photography / Videography',
   'Photo and video services for events and portraits.',
   'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Printing / Photocopy / Signage',
   'Printing, photocopy, and signage services.',
   'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Computer / Internet Shop',
   'Computer rental, printing, and internet access.',
   'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Car Wash / Detailing',
   'Car washing and detailing services.',
   'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Auto Repair / Mechanic',
   'Vehicle repair and maintenance.',
   'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Appliance Repair',
   'Repair of home appliances and electronics.',
   'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Tutorial / Review Center',
   'Academic tutoring and review classes.',
   'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Event / Party Planner',
   'Event planning and party coordination.',
   'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Cleaning / Janitorial',
   'Home and office cleaning services.',
   'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Tattoo / Piercing Studio',
   'Tattoos, piercings, and body art.',
   'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?q=80&w=1600&h=1200&fit=crop&auto=format'),
  ('Services', 'Pawnshop / Remittance',
   'Pawn services, remittance, and money transfer.',
   'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1600&h=1200&fit=crop&auto=format')
) AS v(vertical, name, description, image_url)
  ON bt.name = v.vertical
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_categories existing
   WHERE existing.name = v.name
);
