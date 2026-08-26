DO $$
DECLARE
    food_id UUID;
    retail_id UUID;
    services_id UUID;
    tourism_id UUID;
    entertainment_id UUID;
    health_id UUID;
    education_id UUID;
    home_id UUID;
BEGIN
    -- 1. Insert Business Types and capture IDs (idempotent)
    INSERT INTO business_types (name, description, icon)
    VALUES ('Food & Beverage', 'Businesses that serve food and drinks, ranging from cafés and restaurants to bakeries and street vendors.', 'Coffee')
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO food_id FROM business_types WHERE name = 'Food & Beverage';

    INSERT INTO business_types (name, description, icon)
    VALUES ('Retail', 'Shops that sell goods directly to customers, including groceries, specialty stores, clothing, and books.', 'Store')
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO retail_id FROM business_types WHERE name = 'Retail';

    INSERT INTO business_types (name, description, icon)
    VALUES ('Services', 'Service-oriented businesses offering personal care, wellness, fitness, or repair solutions.', 'Scissors')
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO services_id FROM business_types WHERE name = 'Services';

    INSERT INTO business_types (name, description, icon)
    VALUES ('Tourism & Leisure', 'Businesses that cater to tourists and leisure activities, such as accommodations, tours, cultural experiences, and entertainment venues.', 'Plane')
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO tourism_id FROM business_types WHERE name = 'Tourism & Leisure';

    INSERT INTO business_types (name, description, icon)
    VALUES ('Entertainment & Events', 'Venues and businesses that host entertainment, recreation, and events — karaoke, arcades, billiards, function halls, and cinemas.', 'Clapperboard')
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO entertainment_id FROM business_types WHERE name = 'Entertainment & Events';

    INSERT INTO business_types (name, description, icon)
    VALUES ('Health & Wellness', 'Clinics, labs, and wellness providers offering consultations, treatments, and care.', 'HeartPulse')
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO health_id FROM business_types WHERE name = 'Health & Wellness';

    INSERT INTO business_types (name, description, icon)
    VALUES ('Education & Learning', 'Schools, tutors, and training centers offering classes and instruction.', 'GraduationCap')
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO education_id FROM business_types WHERE name = 'Education & Learning';

    INSERT INTO business_types (name, description, icon)
    VALUES ('Home & Property Services', 'Contractors and tradespeople providing repairs, installation, and property services.', 'Hammer')
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO home_id FROM business_types WHERE name = 'Home & Property Services';

    -- 1a. Scope the offering categories to their vertical (see
    -- 20260801064656). Repeated here because the migration matches ZERO rows
    -- on a fresh database — business_types are created above, and seeds run
    -- AFTER migrations. COALESCE so an admin's reassignment survives a re-seed.
    --
    -- Health & Beauty stays global on purpose: it belongs to a salon's
    -- services and a pharmacy's shelves alike, and pinning it to either takes
    -- it from the other. NULL means "offered to every vertical".
    UPDATE categories SET business_type_id = COALESCE(business_type_id, food_id)
     WHERE slug IN (
       'food-beverages',
       -- 20260805120000
       'meals-rice-dishes', 'snacks-street-food', 'drinks-beverages',
       'bakery-pastries', 'pasalubong-delicacies');
    UPDATE categories SET business_type_id = COALESCE(business_type_id, retail_id)
     WHERE slug IN (
       'clothing-apparel', 'electronics-gadgets', 'home-living',
       -- 20260805120000
       'groceries-essentials', 'handicrafts-souvenirs', 'books-stationery',
       'toys-hobbies',
       -- 20260805130000
       'auto-motor-parts', 'hardware-construction', 'agri-pet-supplies',
       'medicine-pharmacy', 'sports-outdoor', 'bags-footwear', 'baby-kids',
       'jewelry-accessories', 'plants-garden',
       -- 20260807000000 — a refilling station lists priced GOODS, so its
       -- offering category belongs to Retail, not Services.
       'drinking-water-refills');

    -- Services and Tourism had NO categories of their own until 20260805120000
    -- — their pickers offered the single global row and nothing else.
    UPDATE categories SET business_type_id = COALESCE(business_type_id, services_id)
     WHERE slug IN (
       'hair-grooming', 'spa-massage', 'nails-lashes', 'fitness-classes',
       'repairs-maintenance', 'laundry-cleaning',
       -- 20260807000000
       'pest-control-sanitation');
    UPDATE categories SET business_type_id = COALESCE(business_type_id, tourism_id)
     WHERE slug IN (
       'rooms-stays', 'tours-day-trips', 'workshops-experiences',
       'vehicle-rental', 'event-spaces', 'tickets-entry');

    -- New verticals (20260815000000) — one scoped offering category each.
    UPDATE categories SET business_type_id = COALESCE(business_type_id, entertainment_id)
     WHERE slug IN ('entertainment-events');
    UPDATE categories SET business_type_id = COALESCE(business_type_id, health_id)
     WHERE slug IN ('health-medical');
    UPDATE categories SET business_type_id = COALESCE(business_type_id, education_id)
     WHERE slug IN ('classes-training');
    UPDATE categories SET business_type_id = COALESCE(business_type_id, home_id)
     WHERE slug IN ('home-services');

    -- 'gift-sets-bundles' and 'other' stay global for the same reason as
    -- Health & Beauty: they belong in every vertical's picker.

    -- 1b. Offering vocabulary per vertical (see 20260727000001).
    --
    -- The migration seeds this too, but on a FRESH database it matches zero
    -- rows: business_types are created here, and seeds run AFTER migrations.
    -- Without this block a `make migrate-reset` leaves every profile NULL and
    -- the whole feature silently falls back to retail copy locally. Applied
    -- with COALESCE so an admin edit on an existing environment is preserved.
    UPDATE business_types SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
      'products', jsonb_build_object(
        'singular', 'Menu Item', 'plural', 'Menu Items', 'catalogue', 'Menu'),
      'services', jsonb_build_object(
        'singular', 'Service', 'plural', 'Services', 'catalogue', 'Services'),
      'both', jsonb_build_object(
        'singular', 'Item', 'plural', 'Items', 'catalogue', 'Menu & Services'),
      'icon', 'Coffee',
      'fields', jsonb_build_array(),
      'allowed_price_types', jsonb_build_array('fixed', 'from', 'per_person', 'on_request'),
      'default_booking_mode', 'none'
    )) WHERE id = food_id;

    UPDATE business_types SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
      'products', jsonb_build_object(
        'singular', 'Product', 'plural', 'Products', 'catalogue', 'Product Catalogue'),
      'services', jsonb_build_object(
        'singular', 'Service', 'plural', 'Services', 'catalogue', 'Services'),
      'both', jsonb_build_object(
        'singular', 'Item', 'plural', 'Items', 'catalogue', 'Catalogue'),
      'icon', 'Store',
      'fields', jsonb_build_array(),
      'allowed_price_types', jsonb_build_array('fixed', 'from', 'on_request'),
      'default_booking_mode', 'none'
    )) WHERE id = retail_id;

    UPDATE business_types SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
      'products', jsonb_build_object(
        'singular', 'Product', 'plural', 'Products', 'catalogue', 'Products'),
      'services', jsonb_build_object(
        'singular', 'Service', 'plural', 'Services', 'catalogue', 'Service Menu'),
      'both', jsonb_build_object(
        'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Products & Services'),
      'icon', 'Scissors',
      'fields', jsonb_build_array('duration_minutes', 'lead_time_minutes', 'service_location'),
      'allowed_price_types', jsonb_build_array(
        'fixed', 'from', 'per_hour', 'per_person', 'on_request'),
      'default_booking_mode', 'request'
    )) WHERE id = services_id;

    UPDATE business_types SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
      'products', jsonb_build_object(
        'singular', 'Item', 'plural', 'Items', 'catalogue', 'Shop'),
      'services', jsonb_build_object(
        'singular', 'Package', 'plural', 'Packages', 'catalogue', 'Packages'),
      'both', jsonb_build_object(
        'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Offerings'),
      'icon', 'Plane',
      'fields', jsonb_build_array(
        'duration_minutes', 'capacity', 'inventory_count', 'deposit_amount',
        'min_duration_units', 'max_duration_units'),
      'allowed_price_types', jsonb_build_array(
        'fixed', 'from', 'per_day', 'per_person', 'per_event', 'on_request'),
      'default_booking_mode', 'request'
    )) WHERE id = tourism_id;

    -- Launch verticals beyond Tourism (20260815000000). Mirror of the
    -- migration's profiles; the migration matches ZERO rows on a fresh
    -- database (types are created above, seeds run after migrations).
    UPDATE business_types SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
      'products', jsonb_build_object(
        'singular', 'Item', 'plural', 'Items', 'catalogue', 'Shop'),
      'services', jsonb_build_object(
        'singular', 'Package', 'plural', 'Packages', 'catalogue', 'Packages'),
      'both', jsonb_build_object(
        'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Offerings'),
      'icon', 'Clapperboard',
      'fields', jsonb_build_array('duration_minutes', 'capacity', 'service_location'),
      'allowed_price_types', jsonb_build_array(
        'fixed', 'from', 'per_hour', 'per_person', 'per_event', 'on_request'),
      'default_booking_mode', 'request'
    )) WHERE id = entertainment_id;

    UPDATE business_types SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
      'products', jsonb_build_object(
        'singular', 'Item', 'plural', 'Items', 'catalogue', 'Shop'),
      'services', jsonb_build_object(
        'singular', 'Service', 'plural', 'Services', 'catalogue', 'Services'),
      'both', jsonb_build_object(
        'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Offerings'),
      'icon', 'HeartPulse',
      'fields', jsonb_build_array('duration_minutes', 'lead_time_minutes', 'service_location'),
      'allowed_price_types', jsonb_build_array(
        'fixed', 'from', 'per_hour', 'per_person', 'on_request'),
      'default_booking_mode', 'timeslot'
    )) WHERE id = health_id;

    UPDATE business_types SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
      'products', jsonb_build_object(
        'singular', 'Item', 'plural', 'Items', 'catalogue', 'Shop'),
      'services', jsonb_build_object(
        'singular', 'Class', 'plural', 'Classes', 'catalogue', 'Classes'),
      'both', jsonb_build_object(
        'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Offerings'),
      'icon', 'GraduationCap',
      'fields', jsonb_build_array('duration_minutes', 'lead_time_minutes', 'service_location'),
      'allowed_price_types', jsonb_build_array('fixed', 'from', 'per_person', 'on_request'),
      'default_booking_mode', 'request'
    )) WHERE id = education_id;

    UPDATE business_types SET offering_profile = COALESCE(offering_profile, jsonb_build_object(
      'products', jsonb_build_object(
        'singular', 'Item', 'plural', 'Items', 'catalogue', 'Shop'),
      'services', jsonb_build_object(
        'singular', 'Service', 'plural', 'Services', 'catalogue', 'Service Menu'),
      'both', jsonb_build_object(
        'singular', 'Offering', 'plural', 'Offerings', 'catalogue', 'Offerings'),
      'icon', 'Hammer',
      'fields', jsonb_build_array('duration_minutes', 'lead_time_minutes', 'service_location'),
      'allowed_price_types', jsonb_build_array('fixed', 'from', 'per_hour', 'on_request'),
      'default_booking_mode', 'inquiry'
    )) WHERE id = home_id;

    -- 2. Insert Categories for Food & Beverage (skip if already seeded)
    IF NOT EXISTS (SELECT 1 FROM business_categories WHERE business_type_id = food_id) THEN
    INSERT INTO business_categories (business_type_id, name, description, image_url) VALUES
    (food_id, 'Café', 'A casual spot serving coffee, tea, and light meals.', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (food_id, 'Restaurant', 'Full-service dining establishments offering meals and beverages.', 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (food_id, 'Bar / Pub', 'Social venues serving alcoholic drinks and light snacks.', 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (food_id, 'Bakery / Pastry Shop', 'Shops specializing in bread, cakes, and pastries.', 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (food_id, 'Street Food Vendor', 'Small stalls or carts offering quick, affordable local food.', 'https://images.unsplash.com/photo-1664612702379-94f5b5030803?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
    END IF;

    -- 3. Insert Categories for Retail (skip if already seeded)
    IF NOT EXISTS (SELECT 1 FROM business_categories WHERE business_type_id = retail_id) THEN
    INSERT INTO business_categories (business_type_id, name, description, image_url) VALUES
    (retail_id, 'Sari-sari / Convenience Store', 'Neighborhood sari-sari and convenience stores selling daily essentials and fresh produce.', 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (retail_id, 'Gift / Specialty Shop', 'Curated gifts, specialty items, and unique finds.', 'https://images.unsplash.com/photo-1628602592413-cdb2aaf0a353?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (retail_id, 'Clothing / Apparel', 'Fashion boutiques and apparel shops for everyday wear.', 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (retail_id, 'Bookstore / Stationery', 'Shops selling books, magazines, and writing supplies.', 'https://images.unsplash.com/photo-1512820790803-83ca734da794');
    END IF;

    -- 3a. Retail trades added by 20260805130000 (auto supply, hardware,
    -- agrivet, pharmacy, pet, sports). Deliberately OUTSIDE the guard above:
    -- that block skips entirely once ANY retail category exists, so appending
    -- to it would be a no-op on every database that has ever been seeded.
    -- Guarded per row instead — `business_categories.name` has no UNIQUE, so
    -- ON CONFLICT is unavailable (same reason subscription_plans.sql uses this
    -- shape).
    --
    -- ⚠️ image_url must be non-NULL: the registration step renders
    -- <Image src={imageURL}> with no fallback.
    --
    -- images.unsplash.com only. A host must be in imageRemotePatterns AND must
    -- not redirect off it — CSP re-checks every hop, which is how a picsum
    -- first cut (allowlisted, but 302s to fastly.picsum.photos) broke all six.
    -- `h=1200` forces a 4:3 crop: the card top-crops with no object-cover, so a
    -- portrait source would show only its ceiling. See 20260805130000.
    INSERT INTO business_categories (business_type_id, name, description, image_url)
    SELECT retail_id, v.name, v.description, v.image_url
    FROM (VALUES
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
      ('Sports / Outdoor Shop',
       'Sportswear, equipment, camping gear, and outdoor supplies.',
       'https://images.unsplash.com/photo-1768145488772-db787036bb13?q=80&w=1600&h=1200&fit=crop&auto=format')
    ) AS v(name, description, image_url)
    WHERE NOT EXISTS (
      SELECT 1 FROM business_categories existing WHERE existing.name = v.name
    );

    -- 4. Insert Categories for Services (skip if already seeded)
    IF NOT EXISTS (SELECT 1 FROM business_categories WHERE business_type_id = services_id) THEN
    INSERT INTO business_categories (business_type_id, name, description, image_url) VALUES
    (services_id, 'Salon / Barbershop', 'Hair and grooming services for men and women.', 'https://images.unsplash.com/photo-1629397685944-7073f5589754?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (services_id, 'Spa / Wellness Center', 'Facilities offering relaxation, massage, and wellness treatments.', 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (services_id, 'Fitness Studio / Gym', 'Spaces for exercise, training, and group fitness classes.', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (services_id, 'Repair Services', 'Electronics, appliance, tailoring, and general repair.', 'https://images.unsplash.com/photo-1563770660941-20978e870e26?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
    END IF;

    -- 5. Insert Categories for Tourism & Leisure (skip if already seeded)
    IF NOT EXISTS (SELECT 1 FROM business_categories WHERE business_type_id = tourism_id) THEN
    INSERT INTO business_categories (business_type_id, name, description, image_url) VALUES
    (tourism_id, 'Bed & Breakfast / Guesthouse', 'Small lodging establishments offering overnight stays and breakfast.', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (tourism_id, 'Cultural Experience Provider', 'Workshops or classes showcasing local traditions and skills.', 'https://images.unsplash.com/photo-1560831340-b9679dc9e9f0?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (tourism_id, 'Entertainment Venue', 'Spaces for live music, karaoke, theater, and social events.', 'https://images.unsplash.com/photo-1766532721742-186e96e3db3a?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
    END IF;

    -- 6. Service trades added by 20260807000000 (pest control, water refilling).
    -- Deliberately OUTSIDE the guards in 4 and 5 — those skip entirely once ANY
    -- category exists for the vertical, so appending to them is a no-op on every
    -- database that has ever been seeded. Guarded per row instead:
    -- `business_categories.name` has no UNIQUE, so ON CONFLICT is unavailable.
    --
    -- The verticals differ on purpose and it is the load-bearing decision:
    -- `sync_business_type_id` seeds `businesses.offering_mode` from the vertical
    -- name on INSERT, so Services gets a service menu + booking + per-hour
    -- pricing while Retail gets a product catalogue. A refilling station sells
    -- priced containers over a counter, so it is Retail.
    --
    -- ⚠️ image_url must be non-NULL: the registration step renders
    -- <Image src={imageURL}> with no fallback. images.unsplash.com only — a host
    -- must be on imageRemotePatterns AND must not redirect off it (CSP re-checks
    -- every hop). `h=1200` forces a 4:3 crop because the card top-crops with no
    -- object-cover. See 20260805130000.
    INSERT INTO business_categories (business_type_id, name, description, image_url)
    SELECT v.business_type_id, v.name, v.description, v.image_url
    FROM (VALUES
      (services_id, 'Pest Control Service',
       'Pest control, termite treatment, fumigation, and disinfection for homes and businesses.',
       'https://images.unsplash.com/photo-1742483359033-13315b247c74?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Water Refilling Station',
       'Purified and mineral drinking water by the container, with refills and delivery.',
       'https://images.unsplash.com/photo-1752910210936-409d5f700b6f?q=80&w=1600&h=1200&fit=crop&auto=format')
    ) AS v(business_type_id, name, description, image_url)
    WHERE NOT EXISTS (
      SELECT 1 FROM business_categories existing WHERE existing.name = v.name
    );

    -- 7. Broader shop taxonomy added by 20260812130000 (carinderias, electronics,
    -- laundromats, pawnshops, and more). Deliberately OUTSIDE the guards in 2–5
    -- — those skip entirely once ANY category exists for the vertical, so
    -- appending to them is a no-op on every database that has ever been seeded.
    -- Guarded per row instead (no UNIQUE on `name`). Tourism & Leisure is
    -- excluded on purpose: its booking flow is on hold.
    --
    -- Same image rules as block 3a/6: non-NULL, images.unsplash.com only,
    -- `h=1200` for the 4:3 crop.
    INSERT INTO business_categories (business_type_id, name, description, image_url)
    SELECT v.business_type_id, v.name, v.description, v.image_url
    FROM (VALUES
      -- Food & Beverage
      (food_id, 'Carinderia / Eatery',
       'Budget-friendly home-style meals served daily, from silog to viands.',
       'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (food_id, 'Fast Food',
       'Quick, affordable meals and snacks served on the go.',
       'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (food_id, 'Dessert / Ice Cream Parlor',
       'Ice cream, cakes, and sweet treats.',
       'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (food_id, 'Milk Tea / Refreshments',
       'Milk tea, fruit teas, shakes, and cold drinks.',
       'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (food_id, 'Roast / Lechon House',
       'Roasted meats, lechon, and grilled specialties.',
       'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (food_id, 'Catering Service',
       'Food service for events, parties, and gatherings.',
       'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (food_id, 'Seafood / Grill House',
       'Fresh seafood and grilled dishes.',
       'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=1600&h=1200&fit=crop&auto=format'),
      -- Retail
      (retail_id, 'Electronics / Gadgets',
       'Appliances, gadgets, and consumer electronics.',
       'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Cellphone / Load Store',
       'Mobile phones, accessories, and load / e-loading.',
       'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Furniture / Home Goods',
       'Furniture, home décor, and household items.',
       'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Beauty / Cosmetics',
       'Makeup, skincare, and personal care products.',
       'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Optical / Eyewear',
       'Eyeglasses, contact lenses, and vision care.',
       'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Jewelry / Accessories',
       'Jewelry, watches, and fashion accessories.',
       'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Bags / Footwear',
       'Bags, shoes, and footwear.',
       'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Baby / Kids Store',
       'Baby care, childrenswear, and nursery essentials.',
       'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Toys / Hobbies',
       'Toys, games, and hobby supplies.',
       'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Plants / Garden / Flower Shop',
       'Plants, flowers, and garden supplies.',
       'https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Souvenir / Pasalubong / Handicrafts',
       'Local crafts, souvenirs, and take-home gifts.',
       'https://images.unsplash.com/photo-1528458909336-e7a0adfed0a5?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Rice / Grains Dealer',
       'Rice, grains, and agricultural produce.',
       'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Thrift / Ukay-ukay',
       'Second-hand and pre-loved clothing.',
       'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Bike Shop',
       'Bicycles, parts, and accessories.',
       'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1600&h=1200&fit=crop&auto=format'),
      -- Services
      (services_id, 'Laundry / Dry Cleaning',
       'Wash, dry, and iron services.',
       'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Nail / Lash Studio',
       'Manicure, pedicure, nail art, lashes, and brows.',
       'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Massage / Reflexology',
       'Massage, reflexology, and body treatments.',
       'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Tailoring / Alterations',
       'Custom sewing, alterations, and dressmaking.',
       'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Photography / Videography',
       'Photo and video services for events and portraits.',
       'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Printing / Photocopy / Signage',
       'Printing, photocopy, and signage services.',
       'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Computer / Internet Shop',
       'Computer rental, printing, and internet access.',
       'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Car Wash / Detailing',
       'Car washing and detailing services.',
       'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Auto Repair / Mechanic',
       'Vehicle repair and maintenance.',
       'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (education_id, 'Tutorial / Review Center',
       'Academic tutoring and review classes.',
       'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Event / Party Planner',
       'Event planning and party coordination.',
       'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Cleaning / Janitorial',
       'Home and office cleaning services.',
       'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Tattoo / Piercing Studio',
       'Tattoos, piercings, and body art.',
       'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Pawnshop / Remittance',
       'Pawn services, remittance, and money transfer.',
       'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1600&h=1200&fit=crop&auto=format')
    ) AS v(business_type_id, name, description, image_url)
    WHERE NOT EXISTS (
      SELECT 1 FROM business_categories existing WHERE existing.name = v.name
    );

    -- 8. Shop types added by 20260813000000: 'Tour / Travel Operator' and
    -- 'Rentals' under Tourism (both DISABLED — booking flow on hold), plus
    -- 'Rentals' under Services (ACTIVE — a car/equipment hire shop is a
    -- service business, and Services is not gated by the tourism hold).
    --
    -- Guard keyed on name + vertical, NOT name alone: 'Rentals' legitimately
    -- exists under TWO verticals, and a name-only WHERE NOT EXISTS would let
    -- the Services row skip because the Tourism row already matches.
    INSERT INTO business_categories (business_type_id, name, description, image_url, is_active)
    SELECT v.business_type_id, v.name, v.description, v.image_url, v.is_active
    FROM (VALUES
      (tourism_id, 'Tour / Travel Operator',
       'Guided tours, island hopping, and day excursions.',
       'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1600&h=1200&fit=crop&auto=format', false),
      (tourism_id, 'Rentals',
       'Cars, bikes, equipment, and gear for hire.',
       'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1600&h=1200&fit=crop&auto=format', false),
      (services_id, 'Rentals',
       'Cars, bikes, equipment, and gear for hire.',
       'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1600&h=1200&fit=crop&auto=format', true)
    ) AS v(business_type_id, name, description, image_url, is_active)
    WHERE NOT EXISTS (
      SELECT 1 FROM business_categories existing
       WHERE existing.name = v.name
         AND existing.business_type_id = v.business_type_id
    );

    -- 9. Tourism & Leisure is DISABLED until its booking flow ships
    -- (20260813000000). is_active = false hides the whole vertical from public
    -- pickers while keeping the rows for when the flow lands. Unconditional so
    -- a re-seed cannot resurrect it; the migration mirrors this for
    -- already-seeded databases (where these UPDATEs match zero rows because
    -- migrations run BEFORE the seed creates the tourism rows).
    UPDATE business_types SET is_active = false WHERE id = tourism_id;
    UPDATE business_categories SET is_active = false WHERE business_type_id = tourism_id;

    -- 10. High-value additions from the taxonomy audit (20260814000000).
    -- Composite guard (name + vertical), matching block 8 and the migration —
    -- name-only would be a footgun the moment one of these names repeats
    -- across verticals.
    INSERT INTO business_categories (business_type_id, name, description, image_url)
    SELECT v.business_type_id, v.name, v.description, v.image_url
    FROM (VALUES
      (health_id, 'Medical / Dental Clinic',
       'General practice, dental, and specialist consultations.',
       'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (services_id, 'Pet Grooming',
       'Bathing, grooming, and care for pets.',
       'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (retail_id, 'Fruit / Vegetable Stand',
       'Fresh fruits, vegetables, and market produce.',
       'https://images.unsplash.com/photo-1610348725531-843dff563e2c?q=80&w=1600&h=1200&fit=crop&auto=format')
    ) AS v(business_type_id, name, description, image_url)
    WHERE NOT EXISTS (
      SELECT 1 FROM business_categories existing
       WHERE existing.name = v.name
         AND existing.business_type_id = v.business_type_id
    );

    -- 11. The four launch verticals beyond Tourism (20260815000000):
    -- Entertainment & Events, Health & Wellness, Education & Learning,
    -- Home & Property Services. Composite guard (name + vertical), matching
    -- block 8 — the migration creates the rows on existing databases; on a
    -- fresh one (where the migration matched zero rows because the types did
    -- not exist yet) this block is what puts them there. Same image rules as
    -- block 3a/6/7: non-NULL, images.unsplash.com only, `h=1200` for the 4:3
    -- crop. 'Tutorial / Review Center' and 'Medical / Dental Clinic' are the
    -- moved categories and live under their new verticals here too.
    INSERT INTO business_categories (business_type_id, name, description, image_url)
    SELECT v.business_type_id, v.name, v.description, v.image_url
    FROM (VALUES
      -- Entertainment & Events
      (entertainment_id, 'Karaoke / Videoke Bar',
       'Karaoke, videoke, and singing rooms for groups.',
       'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (entertainment_id, 'Game Center / Arcade',
       'Arcade games, consoles, and gaming lounges.',
       'https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (entertainment_id, 'Event Venue / Function Hall',
       'Venues for weddings, parties, and corporate events.',
       'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (entertainment_id, 'Cinema / Theater',
       'Movie theaters and performance stages.',
       'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (entertainment_id, 'Billiards / Recreation Hall',
       'Billiards, darts, and recreation halls.',
       'https://images.unsplash.com/photo-1529257414772-1960b7bea4eb?q=80&w=1600&h=1200&fit=crop&auto=format'),
      -- Health & Wellness
      (health_id, 'Veterinary Clinic',
       'Pet health checkups, vaccinations, and treatments.',
       'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (health_id, 'Dental Clinic / Orthodontist',
       'Dental consultations, cleaning, and orthodontics.',
       'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (health_id, 'Physical Therapy / Rehabilitation',
       'Rehab, physiotherapy, and mobility care.',
       'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (health_id, 'Mental Health / Counseling',
       'Counseling, therapy, and mental wellness.',
       'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (health_id, 'Wellness / Holistic Therapy',
       'Holistic and alternative wellness treatments.',
       'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (health_id, 'Diagnostic / Medical Laboratory',
       'Lab tests, diagnostics, and medical imaging.',
       'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=1600&h=1200&fit=crop&auto=format'),
      -- Education & Learning
      (education_id, 'Music / Arts School',
       'Music, arts, and creative classes.',
       'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (education_id, 'Driving School',
       'Driver education and practical training.',
       'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (education_id, 'Language / Enrichment Classes',
       'Language and enrichment programs.',
       'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (education_id, 'Computer / IT Training',
       'Computer literacy and IT skills training.',
       'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (education_id, 'Daycare / Preschool',
       'Child care and early education.',
       'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=1600&h=1200&fit=crop&auto=format'),
      -- Home & Property Services
      (home_id, 'General Contractor / Renovation',
       'Construction, renovation, and fit-out services.',
       'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (home_id, 'Plumbing / Electrical Services',
       'Plumbing, electrical, and utility work.',
       'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (home_id, 'Aircon Repair / Installation',
       'Aircon cleaning, repair, and installation.',
       'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (home_id, 'Landscaping / Lawn Care',
       'Gardens, lawns, and outdoor maintenance.',
       'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=1600&h=1200&fit=crop&auto=format'),
      (home_id, 'Security / CCTV Installation',
       'CCTV, alarms, and security systems.',
       'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1600&h=1200&fit=crop&auto=format')
    ) AS v(business_type_id, name, description, image_url)
    WHERE NOT EXISTS (
      SELECT 1 FROM business_categories existing
       WHERE existing.name = v.name
         AND existing.business_type_id = v.business_type_id
    );

    -- 12. 'General' fallback category per ACTIVE vertical
    -- (20260819010000). One row per type as the honest last resort for a shop
    -- that fits none of the specific categories. The migration creates the
    -- rows for whichever types exist AT MIGRATION TIME — on a fresh DB that is
    -- the 4 verticals seeded by 20260815000000_new_business_types.sql, NOT
    -- zero — and this block covers the types the seed itself creates (Food &
    -- Beverage, Retail, Services). The composite guard makes the split safe
    -- either way: the two files agree per (name, vertical).
    --
    -- Composite guard (name + vertical) matching blocks 8/10/11, so a future
    -- re-seed cannot duplicate a row that is already live. Tourism & Leisure
    -- is deliberately excluded: the vertical is disabled (is_active = false),
    -- so a General row there would be invisible to every picker. Same image
    -- rules as blocks 3a/6/7/11: non-NULL, images.unsplash.com only, `h=1200`
    -- for the 4:3 crop.
    INSERT INTO business_categories (business_type_id, name, description, image_url)
    SELECT bt.id, v.name, v.description, v.image_url
    FROM business_types bt
    JOIN (VALUES
      ('Food & Beverage', 'General',
       'Shops that fit none of the more specific food and drink categories.',
       'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
      ('Retail', 'General',
       'Stores that fit none of the more specific retail categories.',
       'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
      ('Services', 'General',
       'Services that fit none of the more specific service categories.',
       'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
      ('Entertainment & Events', 'General',
       'Entertainment, events, and recreation venues that fit none of the more specific categories.',
       'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
      ('Health & Wellness', 'General',
       'Health and wellness providers that fit none of the more specific categories.',
       'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
      ('Education & Learning', 'General',
       'Learning providers that fit none of the more specific categories.',
       'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'),
      ('Home & Property Services', 'General',
       'Home and property services that fit none of the more specific categories.',
       'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format')
    ) AS v(vertical, name, description, image_url)
      ON bt.name = v.vertical
    WHERE NOT EXISTS (
      SELECT 1 FROM business_categories existing
       WHERE existing.name = v.name
         AND existing.business_type_id = bt.id
    );

END $$;

-- ============================================================
-- 12. Sports & Recreation — mirrors migration 20260826000000
-- ------------------------------------------------------------
-- Only the RE-PIN is mirrored here, and it is not optional.
--
-- On a fresh database the migration's step 3 matches zero rows: business_types
-- and business_categories are created by THIS seed, which runs AFTER
-- migrations. The seed's per-vertical blocks then create 'Sports / Outdoor
-- Shop' under Retail, 'Fitness Studio / Gym' under Services and the two
-- Entertainment rows — silently undoing the move on every `migrate-reset`.
--
-- Everything else the migration does survives a fresh run unaided and is
-- deliberately NOT repeated:
--   • the vertical, the two new shop types and the General row are inserted
--     unconditionally by the migration, so they exist before this file runs;
--   • the offering-category re-pin sticks because the pins above are
--     COALESCE(business_type_id, …), which cannot move an already-pinned row.
--     Re-pinning them here would instead overwrite an admin's reassignment,
--     which is exactly what the COALESCE idiom exists to prevent.
--
-- Its own block rather than an append to the Retail/Services/Entertainment
-- blocks: those are wrapped in `IF NOT EXISTS (… WHERE business_type_id = X)`,
-- so anything added there is a no-op on every database that has ever been
-- seeded.
-- ============================================================
DO $$
DECLARE
  v_sports UUID;
BEGIN
  -- Normally already present from 20260826000000. Guarded so this file stays
  -- runnable against a database whose migration history predates it.
  INSERT INTO business_types (name, description, icon, is_active)
  VALUES ('Sports & Recreation',
          'Gyms, courts and sports facilities, recreation halls, gaming cafés, and sports gear.',
          'Dumbbell', true)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_sports FROM business_types WHERE name = 'Sports & Recreation';

  -- Matched on (name, CURRENT vertical) so a re-run is a no-op and a
  -- same-named row belonging elsewhere is never captured. 'Bike Shop' is
  -- deliberately absent — its trade is goods, and it stays under Retail.
  UPDATE business_categories bc
     SET business_type_id = v_sports
    FROM business_types old
   WHERE old.id = bc.business_type_id
     AND (bc.name, old.name) IN (
       ('Sports / Outdoor Shop',       'Retail'),
       ('Fitness Studio / Gym',        'Services'),
       ('Billiards / Recreation Hall', 'Entertainment & Events'),
       ('Game Center / Arcade',        'Entertainment & Events'),
       ('Computer / Internet Shop',    'Services')
     );

  -- 'Fitness Studio / Gym' is seeded above with the legacy URL shape (w=2340,
  -- no h=, dead ixlib/ixid params). Without h= the card's top-crop is
  -- unpredictable, and it would be the only odd image in the vertical.
  UPDATE business_categories bc
     SET image_url = split_part(bc.image_url, '?', 1)
                     || '?q=80&w=1600&h=1200&fit=crop&auto=format'
   WHERE bc.business_type_id = v_sports
     AND bc.image_url LIKE 'https://images.unsplash.com/%'
     AND split_part(bc.image_url, '?', 2) <> 'q=80&w=1600&h=1200&fit=crop&auto=format';
END $$;
