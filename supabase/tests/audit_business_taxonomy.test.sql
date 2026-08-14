-- Behavioral test for migration 20260816000000 (audit business taxonomy
-- changes) on top of 20260526000011 (audit_log).
--
-- The claim: re-classifying a business (changing category — which also flips
-- business_type_id via sync_business_type_id()) writes readable old → new
-- audit rows admins can review.
--
-- Non-destructive: runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/audit_business_taxonomy.test.sql
--
-- Expected tail: "ALL BUSINESS TAXONOMY AUDIT TESTS PASSED".

BEGIN;

DO $$
DECLARE
  v_owner       UUID;
  v_biz         UUID;
  v_cat_a       UUID;
  v_cat_b       UUID;
  v_type_a      UUID;
  v_type_b      UUID;
  v_cat_a_name  TEXT;
  v_cat_b_name  TEXT;
  v_type_a_name TEXT;
  v_type_b_name TEXT;
  v_count       INTEGER;
  v_row         RECORD;
BEGIN
  -- ─────────────────────────── fixtures ────────────────────────────────────
  SELECT id INTO v_owner FROM public.profiles LIMIT 1;
  ASSERT v_owner IS NOT NULL, 'fixtures missing: seed profiles first';

  SELECT business_categories.id, business_categories.name,
         business_types.id, business_types.name
    INTO v_cat_a, v_cat_a_name, v_type_a, v_type_a_name
    FROM public.business_categories
    JOIN public.business_types ON business_types.id = business_categories.business_type_id
   LIMIT 1;
  ASSERT v_cat_a IS NOT NULL, 'fixtures missing: seed business_categories first';

  -- From a DIFFERENT vertical than v_cat_a, so the type flip is exercised too.
  SELECT business_categories.id, business_categories.name, business_types.name
    INTO v_cat_b, v_cat_b_name, v_type_b_name
    FROM public.business_categories
    JOIN public.business_types ON business_types.id = business_categories.business_type_id
   WHERE business_categories.id <> v_cat_a
     AND business_types.id <> v_type_a
   LIMIT 1;
  ASSERT v_cat_b IS NOT NULL, 'fixtures missing: need a second category';

  -- ─────────────────── a category change is audited, old → new ─────────────
  INSERT INTO public.businesses
    (owner_id, shop_name, weekly_view_count, offering_mode, status, category_id)
  VALUES
    (v_owner, 'Audit Taxonomy Test Shop', 0, 'products', 'pending', v_cat_a)
  RETURNING id INTO v_biz;

  -- The sync trigger derives business_type_id from the category.
  SELECT business_type_id INTO v_type_a FROM public.businesses WHERE id = v_biz;
  ASSERT v_type_a IS NOT NULL, 'business_type_id not derived on insert';

  -- Change category → type flips along (sync trigger) → TWO audit rows.
  UPDATE public.businesses SET category_id = v_cat_b WHERE id = v_biz;

  SELECT count(*) INTO v_count
    FROM public.audit_log
   WHERE table_name = 'businesses' AND record_id = v_biz;
  ASSERT v_count >= 2, 'expected >= 2 audit rows for category + type change, got ' || v_count;

  -- Category row: readable names, correct direction.
  SELECT count(*) INTO v_count
    FROM public.audit_log
   WHERE table_name = 'businesses'
     AND record_id = v_biz
     AND old_value->>'category_name' = v_cat_a_name
     AND new_value->>'category_name' = v_cat_b_name;
  ASSERT v_count = 1, 'category audit row missing or wrong direction';

  -- Type row: derived flip is audited too.
  SELECT business_type_id INTO v_type_b FROM public.businesses WHERE id = v_biz;
  SELECT count(*) INTO v_count
    FROM public.audit_log
   WHERE table_name = 'businesses'
     AND record_id = v_biz
     AND old_value->>'business_type_name' = v_type_a_name
     AND new_value->>'business_type_name' = v_type_b_name;
  ASSERT v_count = 1, 'type audit row missing or wrong direction';

  -- ─────────────── a no-op category write produces NO audit row ────────────
  UPDATE public.businesses SET category_id = v_cat_b WHERE id = v_biz;
  SELECT count(*) INTO v_count
    FROM public.audit_log
   WHERE table_name = 'businesses'
     AND record_id = v_biz
     AND old_value->>'category_name' = v_cat_b_name;
  ASSERT v_count = 0, 'no-op category write must not create an audit row';

  RAISE NOTICE 'ALL BUSINESS TAXONOMY AUDIT TESTS PASSED';
END;
$$;

ROLLBACK;
