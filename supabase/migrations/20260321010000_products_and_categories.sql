-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  image_url VARCHAR(512),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indices
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_categories_slug ON categories(slug);

-- Enable RLS for categories (admin-only writes, public reads)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_anyone_read" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_write" ON categories
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "categories_admin_update" ON categories
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "categories_admin_delete" ON categories
  FOR DELETE USING (auth.jwt() ->> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

-- Enable RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_anyone_read_active" ON products
  FOR SELECT USING (status = 'active');

CREATE POLICY "products_owner_read" ON products
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM businesses WHERE id = products.business_id)
  );

CREATE POLICY "products_owner_write" ON products
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM businesses WHERE id = products.business_id)
  );

CREATE POLICY "products_owner_update" ON products
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM businesses WHERE id = products.business_id)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM businesses WHERE id = products.business_id)
  );

CREATE POLICY "products_owner_delete" ON products
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM businesses WHERE id = products.business_id)
  );

-- Grant permissions
GRANT SELECT ON categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;
