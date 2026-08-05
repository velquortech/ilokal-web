DO $$
DECLARE
    food_id UUID;
    retail_id UUID;
    services_id UUID;
    tourism_id UUID;
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
       'jewelry-accessories', 'plants-garden');

    -- Services and Tourism had NO categories of their own until 20260805120000
    -- — their pickers offered the single global row and nothing else.
    UPDATE categories SET business_type_id = COALESCE(business_type_id, services_id)
     WHERE slug IN (
       'hair-grooming', 'spa-massage', 'nails-lashes', 'fitness-classes',
       'repairs-maintenance', 'laundry-cleaning');
    UPDATE categories SET business_type_id = COALESCE(business_type_id, tourism_id)
     WHERE slug IN (
       'rooms-stays', 'tours-day-trips', 'workshops-experiences',
       'vehicle-rental', 'event-spaces', 'tickets-entry');

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
    (retail_id, 'Local Grocery / Convenience Store', 'Neighborhood stores selling daily essentials and fresh produce.', 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (retail_id, 'Specialty Shop', 'Stores offering unique crafts, souvenirs, or delicacies.', 'https://images.unsplash.com/photo-1628602592413-cdb2aaf0a353?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (retail_id, 'Clothing & Apparel', 'Fashion boutiques and apparel shops for everyday wear.', 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
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
      ('Sports & Outdoor Shop',
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
    (services_id, 'Repair Services', 'Shops providing repair for electronics, tailoring, and more.', 'https://images.unsplash.com/photo-1563770660941-20978e870e26?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
    END IF;

    -- 5. Insert Categories for Tourism & Leisure (skip if already seeded)
    IF NOT EXISTS (SELECT 1 FROM business_categories WHERE business_type_id = tourism_id) THEN
    INSERT INTO business_categories (business_type_id, name, description, image_url) VALUES
    (tourism_id, 'Bed & Breakfast / Guesthouse', 'Small lodging establishments offering overnight stays and breakfast.', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (tourism_id, 'Cultural Experience Provider', 'Workshops or classes showcasing local traditions and skills.', 'https://images.unsplash.com/photo-1560831340-b9679dc9e9f0?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
    (tourism_id, 'Entertainment Venue', 'Spaces for live music, karaoke, theater, and social events.', 'https://images.unsplash.com/photo-1766532721742-186e96e3db3a?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
    END IF;

END $$;