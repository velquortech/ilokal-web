-- Behavioral tests for migration 20260727000000 (offerings phase 1:
-- products.kind, businesses.offering_mode + business_type_id, the type-sync
-- trigger, categories.business_type_id).
--
-- Asserts against the local seed data; non-destructive (everything runs inside
-- a transaction that is ROLLBACK'd at the end). Any ASSERT failure aborts with
-- a clear error. Run:
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/offerings_discriminators.test.sql
--
-- Expected tail: "ALL SQL TESTS PASSED".

BEGIN;

DO $$
DECLARE
  v_biz          UUID;
  v_salon_cat    UUID;
  v_type         TEXT;
  v_null_types   INT;
  v_bad_mode     INT;
  v_kind         TEXT;
  v_failed       BOOLEAN;
BEGIN
  -- ─────────────────── backfill: business_type_id ──────────────────────────

  -- Every business with a category resolved to a type; the denormalized column
  -- is what phase 2's vocabulary lookup reads, so a NULL here is a silent
  -- fallback to retail copy.
  SELECT count(*) INTO v_null_types
    FROM businesses b
   WHERE b.category_id IS NOT NULL
     AND b.business_type_id IS NULL;
  ASSERT v_null_types = 0,
    format('businesses with a category but no resolved type: %s', v_null_types);

  -- ─────────────────── backfill: offering_mode ─────────────────────────────

  -- Services businesses can't be selling goods; Tourism genuinely sells both.
  SELECT count(*) INTO v_bad_mode
    FROM businesses b
    JOIN business_types bt ON bt.id = b.business_type_id
   WHERE (bt.name = 'Services'          AND b.offering_mode <> 'services')
      OR (bt.name = 'Tourism & Leisure' AND b.offering_mode <> 'both')
      OR (bt.name IN ('Retail', 'Food & Beverage')
          AND b.offering_mode <> 'products');
  ASSERT v_bad_mode = 0,
    format('businesses whose offering_mode does not match their type: %s', v_bad_mode);

  -- NOTE: there is deliberately no "every product of a Services business is
  -- kind=service" assertion. That flip is a POINT-IN-TIME BACKFILL, not an
  -- invariant: a services business must still be able to list a real product
  -- (a salon selling shampoo), which is why no trigger force-flips `kind` —
  -- the add form sends it explicitly from defaultKindForMode instead. Rows
  -- created after the migration (including every seeded row, since seeds run
  -- after migrations) legitimately carry the 'product' default.
  --
  -- What IS invariant: kind only ever holds a value the CHECK allows, and a
  -- service row round-trips.
  INSERT INTO products (business_id, name, price, kind, status)
  VALUES ((SELECT id FROM businesses LIMIT 1), 'Kind Probe', 100, 'service', 'active')
  RETURNING kind INTO v_kind;
  ASSERT v_kind = 'service', 'a service-kind row did not round-trip';

  -- ─────────────────── trigger: category change resyncs type ───────────────

  SELECT id INTO v_biz FROM businesses WHERE offering_mode = 'products' LIMIT 1;
  SELECT id INTO v_salon_cat FROM business_categories
   WHERE name = 'Salon / Barbershop' LIMIT 1;
  ASSERT v_biz IS NOT NULL AND v_salon_cat IS NOT NULL,
    'fixtures missing: need a products-mode business and the salon category';

  UPDATE businesses SET category_id = v_salon_cat WHERE id = v_biz;
  SELECT bt.name INTO v_type
    FROM businesses b JOIN business_types bt ON bt.id = b.business_type_id
   WHERE b.id = v_biz;
  ASSERT v_type = 'Services',
    format('trigger did not resync business_type_id on category change (got %s)', v_type);

  -- Clearing the category must clear the denormalized type, not strand it.
  UPDATE businesses SET category_id = NULL WHERE id = v_biz;
  PERFORM 1 FROM businesses WHERE id = v_biz AND business_type_id IS NOT NULL;
  ASSERT NOT FOUND, 'clearing category_id left a stale business_type_id';

  -- ─────────────────── CHECK constraints reject junk ───────────────────────

  v_failed := FALSE;
  BEGIN
    UPDATE products SET kind = 'rental' WHERE id = (SELECT id FROM products LIMIT 1);
  EXCEPTION WHEN check_violation THEN
    v_failed := TRUE;
  END;
  ASSERT v_failed, 'products.kind accepted a value outside the CHECK';

  v_failed := FALSE;
  BEGIN
    UPDATE businesses SET offering_mode = 'retail' WHERE id = v_biz;
  EXCEPTION WHEN check_violation THEN
    v_failed := TRUE;
  END;
  ASSERT v_failed, 'businesses.offering_mode accepted a value outside the CHECK';

  -- ─────────────────── defaults keep existing writes working ───────────────

  -- An INSERT that predates the column (no `kind`) must still land as a product.
  INSERT INTO products (business_id, name, price, status)
  VALUES ((SELECT id FROM businesses LIMIT 1), 'Default Kind Probe', 1, 'active')
  RETURNING kind INTO v_kind;
  ASSERT v_kind = 'product',
    format('products.kind default is not product (got %s)', v_kind);

  -- ─────────────────── categories scoping is opt-in ────────────────────────

  -- Existing categories stay global (NULL) so today's picker is unchanged.
  SELECT count(*) INTO v_bad_mode FROM categories WHERE business_type_id IS NOT NULL;
  ASSERT v_bad_mode = 0,
    format('categories were unexpectedly scoped by the migration: %s', v_bad_mode);

  -- ─────────────────── phase 2: offering_profile seed ─────────────────────

  -- Every shipped vertical must define all three modes with all three nouns.
  -- A half-defined profile still renders (the resolver fills gaps from retail
  -- copy), but it would silently read "Service Menu" + "Add Product".
  SELECT count(*) INTO v_bad_mode
    FROM business_types bt,
         LATERAL (VALUES ('products'), ('services'), ('both')) AS m(mode),
         LATERAL (VALUES ('singular'), ('plural'), ('catalogue')) AS n(noun)
   WHERE bt.name IN ('Food & Beverage', 'Retail', 'Services', 'Tourism & Leisure')
     AND coalesce(bt.offering_profile -> m.mode ->> n.noun, '') = '';
  ASSERT v_bad_mode = 0,
    format('seeded offering_profile entries missing a noun: %s', v_bad_mode);

  -- The salon reading is the one this whole phase exists for.
  SELECT offering_profile -> 'services' ->> 'catalogue' INTO v_type
    FROM business_types WHERE name = 'Services';
  ASSERT v_type = 'Service Menu',
    format('Services vertical does not read "Service Menu" (got %s)', v_type);

  -- ─────────────────── phase 3: quote pricing + attributes ────────────────

  -- A quote-based offering may carry no price...
  INSERT INTO products (business_id, name, price, price_type, status)
  VALUES ((SELECT id FROM businesses LIMIT 1), 'Quote Probe', NULL, 'on_request', 'active')
  RETURNING kind INTO v_kind;
  ASSERT v_kind = 'product', 'unexpected default kind on the quote probe';

  -- ...but nothing else may.
  v_failed := FALSE;
  BEGIN
    INSERT INTO products (business_id, name, price, price_type, status)
    VALUES ((SELECT id FROM businesses LIMIT 1), 'Priceless Probe', NULL, 'fixed', 'active');
  EXCEPTION WHEN check_violation THEN
    v_failed := TRUE;
  END;
  ASSERT v_failed, 'a non-quote offering was allowed to have a NULL price';

  -- An unsatisfiable duration range is rejected.
  v_failed := FALSE;
  BEGIN
    INSERT INTO products (business_id, name, price, min_duration_units, max_duration_units)
    VALUES ((SELECT id FROM businesses LIMIT 1), 'Bad Range Probe', 100, 5, 2);
  EXCEPTION WHEN check_violation THEN
    v_failed := TRUE;
  END;
  ASSERT v_failed, 'min_duration_units > max_duration_units was accepted';

  -- booking_mode is constrained to the known set.
  v_failed := FALSE;
  BEGIN
    UPDATE products SET booking_mode = 'calendar'
     WHERE id = (SELECT id FROM products LIMIT 1);
  EXCEPTION WHEN check_violation THEN
    v_failed := TRUE;
  END;
  ASSERT v_failed, 'products.booking_mode accepted a value outside the CHECK';

  -- A van-rental shaped row round-trips.
  INSERT INTO products (
    business_id, name, price, price_type, kind, booking_mode,
    inventory_count, capacity, deposit_amount, min_duration_units,
    max_duration_units, service_location, status
  ) VALUES (
    (SELECT id FROM businesses LIMIT 1), 'Van Hire Probe', 3500, 'per_day',
    'service', 'date_range', 3, 12, 2000, 1, 14, 'both', 'active'
  );
  ASSERT FOUND, 'a van-rental shaped row could not be inserted';

  -- The RPC must project the new columns, or mobile never sees them.
  SELECT count(*) INTO v_bad_mode
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'products'
     AND column_name IN (
       'kind','booking_mode','duration_minutes','lead_time_minutes',
       'inventory_count','capacity','deposit_amount','min_duration_units',
       'max_duration_units','service_location');
  ASSERT v_bad_mode = 10,
    format('expected 10 offering columns on products, found %s', v_bad_mode);

  RAISE NOTICE 'ALL SQL TESTS PASSED';
END $$;

ROLLBACK;
