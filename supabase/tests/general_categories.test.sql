-- Behavioral test for migration 20260819010000 (general fallback category).
--
-- The claim: every ACTIVE business type has exactly ONE live 'General'
-- category — the last-resort pick for shops that fit none of the specific
-- categories — with a non-null image (the registration card renders it with
-- no fallback) and a real description; and Tourism & Leisure, whose vertical
-- is disabled, has deliberately none.
--
-- Non-destructive: runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/general_categories.test.sql
--
-- Expected tail: "ALL GENERAL CATEGORIES TESTS PASSED".

BEGIN;

DO $$
DECLARE
  v_bad INTEGER;
  v_row RECORD;
BEGIN
  -- 1. Every ACTIVE vertical has exactly one live General category.
  SELECT count(*) INTO v_bad
    FROM public.business_types bt
   WHERE bt.is_active = true
     AND bt.deleted_at IS NULL
     AND (
          SELECT count(*)
            FROM public.business_categories bc
           WHERE bc.business_type_id = bt.id
             AND bc.name = 'General'
             AND bc.is_active = true
             AND bc.deleted_at IS NULL
     ) <> 1;
  ASSERT v_bad = 0,
    format('an active vertical does not have exactly one live General category (%s offenders)', v_bad);

  -- 2. Every General row carries the image the registration card renders and
  --    a description worth showing.
  SELECT count(*) INTO v_bad
    FROM public.business_categories
   WHERE name = 'General'
     AND (
          image_url IS NULL OR image_url = ''
       OR description IS NULL OR description = ''
     );
  ASSERT v_bad = 0, 'a General category is missing its image or description';

  -- 3. No ACTIVE vertical carries two live General rows (duplicate protection).
  SELECT count(*) INTO v_bad
    FROM (
      SELECT business_type_id
        FROM public.business_categories
       WHERE name = 'General'
         AND is_active = true
         AND deleted_at IS NULL
       GROUP BY business_type_id
      HAVING count(*) > 1
    ) dup;
  ASSERT v_bad = 0, 'a vertical has duplicate live General categories';

  -- 4. Tourism & Leisure (disabled) deliberately has none — its vertical is
  --    on hold, so a General row there would be invisible to every picker.
  --    Asserting the absence pins the exclusion as a decision, not an accident.
  SELECT count(*) INTO v_bad
    FROM public.business_types bt
    JOIN public.business_categories bc
      ON bc.business_type_id = bt.id
   WHERE bt.name = 'Tourism & Leisure'
     AND bc.name = 'General';
  ASSERT v_bad = 0, 'Tourism & Leisure has a General category while disabled';

  -- 5. Re-running the guarded insert must not duplicate (the migration is
  --    idempotent by construction; prove it against the live rows).
  INSERT INTO public.business_categories (business_type_id, name, description, image_url)
  SELECT bt.id, 'General', 'duplicate probe', 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1600&h=1200&fit=crop&auto=format'
    FROM public.business_types bt
   WHERE bt.is_active = true
     AND NOT EXISTS (
       SELECT 1 FROM public.business_categories existing
        WHERE existing.name = 'General'
          AND existing.business_type_id = bt.id
     );

  SELECT count(*) INTO v_bad
    FROM (
      SELECT business_type_id
        FROM public.business_categories
       WHERE name = 'General'
         AND deleted_at IS NULL
       GROUP BY business_type_id
      HAVING count(*) > 1
    ) dup;
  ASSERT v_bad = 0, 're-running the insert duplicated a General category';

  RAISE NOTICE 'ALL GENERAL CATEGORIES TESTS PASSED';
END $$;

ROLLBACK;
