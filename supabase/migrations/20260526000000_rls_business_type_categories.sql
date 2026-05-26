-- SEC-01: Enable RLS on business_types and business_categories
-- Both tables were created without RLS, leaving them open to unauthenticated writes.
-- Public SELECT is intentional — these are reference/lookup tables.

ALTER TABLE business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

-- business_types
CREATE POLICY "Public view business types"
  ON business_types FOR SELECT
  USING (true);

CREATE POLICY "Admins manage business types"
  ON business_types FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- business_categories
CREATE POLICY "Public view business categories"
  ON business_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage business categories"
  ON business_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
