-- business_settings: per-business extended configuration
-- Stores operating hours, social/contact links, review policy, and coupon defaults.

CREATE TABLE IF NOT EXISTS business_settings (
  business_id               uuid        PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  operating_hours           jsonb,
  social_links              jsonb,
  contact_website           text,
  contact_phone_public      text,
  allow_reviews             boolean     NOT NULL DEFAULT true,
  coupon_default_expiry_days integer     NOT NULL DEFAULT 30
                                          CHECK (coupon_default_expiry_days > 0),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own business settings"
  ON business_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = business_id
        AND b.owner_id = auth.uid()
    )
  );
