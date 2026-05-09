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