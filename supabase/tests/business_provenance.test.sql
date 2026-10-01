-- Behavioral tests for migration 20261001000000 (business provenance).
--
-- The migration adds five columns, two indexes and a CHECK constraint. Each can
-- fail silently in a way that only surfaces much later, so each gets a block:
--   1. the columns exist, with `source` defaulting to 'owner',
--   2. the `source` CHECK rejects an unknown provenance,
--   3. the PARTIAL unique index makes re-imports idempotent while still
--      allowing many owner/manual rows to share a NULL source_ref,
--   4. `businesses_seeded_no_images` blocks third-party imagery on seeded rows
--      but exempts owner rows — the copyright guardrail,
--   5. the backfill left every pre-existing owner row marked as claimed,
--   6. claim bookkeeping (claimed_at/claimed_by) behaves, and `source_ref`
--      survives a claim so the takedown key is never lost.
--
-- Block 4 is the one that matters most. `resolveStorageUrl`
-- (app/api/helpers/storage.ts) passes any `http(s)://` value straight through to
-- the client, so nothing in the READ path can catch a pasted CDN URL. The
-- constraint is the only thing standing between a careless import and
-- distributing someone else's photo.
--
-- Non-destructive: runs inside a transaction that is ROLLBACK'd.
--
--   docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/tests/business_provenance.test.sql
--
-- Expected tail: "ALL BUSINESS PROVENANCE TESTS PASSED".

BEGIN;

-- ─────────────────── 1. the columns and their defaults ───────────────────
DO $$
DECLARE
  v_missing TEXT;
  v_default TEXT;
  v_notnull BOOLEAN;
BEGIN
  SELECT string_agg(c, ', ')
    INTO v_missing
    FROM unnest(ARRAY['source','source_ref','source_license','claimed_at','claimed_by']) AS c
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = c
   );
  ASSERT v_missing IS NULL, format('provenance columns missing: %s', v_missing);

  -- The default is what makes the migration safe on an existing table: every
  -- row that predates provenance is, correctly, owner-registered.
  SELECT column_default, is_nullable = 'NO'
    INTO v_default, v_notnull
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'source';

  ASSERT v_default LIKE '%owner%', format('source default should be owner, got %L', v_default);
  ASSERT v_notnull, 'source must be NOT NULL — an unknown provenance is not a valid state';
END $$;

-- ─────────────────── 2. the source CHECK ───────────────────
DO $$
DECLARE
  v_owner UUID;
BEGIN
  SELECT owner_id INTO v_owner FROM businesses LIMIT 1;

  BEGIN
    INSERT INTO businesses (owner_id, shop_name, source, status)
    VALUES (v_owner, 'test-bad-source', 'google', 'verified');
    ASSERT false, 'source CHECK accepted an unknown provenance';
  EXCEPTION WHEN check_violation THEN
    NULL;  -- expected
  END;
END $$;

-- ─────────────────── 3. the partial unique index ───────────────────
DO $$
DECLARE
  v_owner UUID;
BEGIN
  SELECT owner_id INTO v_owner FROM businesses LIMIT 1;

  INSERT INTO businesses (owner_id, shop_name, source, source_ref, source_license, status)
  VALUES (v_owner, 'test-osm-a', 'osm', 'node/900000001', 'ODbL', 'verified');

  -- A re-import must be a no-op, not a duplicate listing. This is what lets the
  -- importer be re-run safely against upstream corrections.
  BEGIN
    INSERT INTO businesses (owner_id, shop_name, source, source_ref, source_license, status)
    VALUES (v_owner, 'test-osm-a-again', 'osm', 'node/900000001', 'ODbL', 'verified');
    ASSERT false, 'unique index allowed a duplicate (source, source_ref)';
  EXCEPTION WHEN unique_violation THEN
    NULL;  -- expected
  END;

  -- The SAME ref under a DIFFERENT source is a different record and must be
  -- allowed — ids are only unique within their upstream.
  INSERT INTO businesses (owner_id, shop_name, source, source_ref, status)
  VALUES (v_owner, 'test-fsq-same-ref', 'foursquare', 'node/900000001', 'verified');

  -- Partial index: owner/manual rows legitimately share a NULL source_ref, and
  -- a plain unique index would have collapsed them into one.
  INSERT INTO businesses (owner_id, shop_name, source, status)
  VALUES (v_owner, 'test-manual-1', 'manual', 'verified');
  INSERT INTO businesses (owner_id, shop_name, source, status)
  VALUES (v_owner, 'test-manual-2', 'manual', 'verified');
END $$;

-- ─────────────────── 4. the no-third-party-images guardrail ───────────────────
DO $$
DECLARE
  v_owner UUID;
BEGIN
  SELECT owner_id INTO v_owner FROM businesses LIMIT 1;

  -- A seeded row carrying a scraped photo must be rejected at the write
  -- boundary. Place photos belong to their contributors and are not
  -- sublicensed to us.
  BEGIN
    INSERT INTO businesses (owner_id, shop_name, source, source_ref, logo_url, status)
    VALUES (v_owner, 'test-scraped-logo', 'osm', 'node/900000002',
            'https://lh3.googleusercontent.com/p/example', 'verified');
    ASSERT false, 'seeded row accepted a third-party logo_url';
  EXCEPTION WHEN check_violation THEN
    NULL;  -- expected
  END;

  -- banner_url and interior_images are equally reachable from a read path, so
  -- the constraint must cover all three, not just the logo.
  BEGIN
    INSERT INTO businesses (owner_id, shop_name, source, source_ref, banner_url, status)
    VALUES (v_owner, 'test-scraped-banner', 'osm', 'node/900000003',
            'https://example.com/banner.jpg', 'verified');
    ASSERT false, 'seeded row accepted a third-party banner_url';
  EXCEPTION WHEN check_violation THEN
    NULL;  -- expected
  END;

  BEGIN
    INSERT INTO businesses (owner_id, shop_name, source, source_ref, interior_images, status)
    VALUES (v_owner, 'test-scraped-gallery', 'osm', 'node/900000004',
            ARRAY['https://example.com/1.jpg'], 'verified');
    ASSERT false, 'seeded row accepted third-party interior_images';
  EXCEPTION WHEN check_violation THEN
    NULL;  -- expected
  END;

  -- An EMPTY array is not imagery and must pass — otherwise an importer that
  -- writes `ARRAY[]::text[]` rather than NULL would fail for no good reason.
  INSERT INTO businesses (owner_id, shop_name, source, source_ref, interior_images, status)
  VALUES (v_owner, 'test-seeded-empty-gallery', 'osm', 'node/900000005',
          ARRAY[]::text[], 'verified');

  -- Owner rows are exempt: an owner uploading their own photo is the whole
  -- point of the product.
  INSERT INTO businesses (owner_id, shop_name, source, logo_url, banner_url, status)
  VALUES (v_owner, 'test-owner-with-images', 'owner',
          'some-business-id/logo.webp', 'some-business-id/banner.webp', 'verified');

  -- A 'manual' row is staff-entered from a public record; staff may legitimately
  -- have taken the photo themselves, so manual is NOT exempt by design — it must
  -- still be rejected, keeping the exemption narrow to 'owner'.
  BEGIN
    INSERT INTO businesses (owner_id, shop_name, source, logo_url, status)
    VALUES (v_owner, 'test-manual-with-image', 'manual', 'https://example.com/x.jpg', 'verified');
    ASSERT false, 'manual row accepted a third-party image — exemption is too wide';
  EXCEPTION WHEN check_violation THEN
    NULL;  -- expected
  END;
END $$;

-- ─────────────────── 5. the backfill ───────────────────
DO $$
DECLARE
  v_unclaimed_owners INT;
  v_mismatched INT;
BEGIN
  -- Every owner-registered row must read as claimed. A business created through
  -- the owner wizard was created BY its owner, so `claimed_at IS NOT NULL`
  -- should be a reliable "someone vouched for this" test rather than one that
  -- only holds for rows that went through the new claim flow.
  -- Scoped to rows that predate this test's own inserts.
  SELECT count(*) INTO v_unclaimed_owners
    FROM businesses
   WHERE source = 'owner' AND claimed_at IS NULL
     AND shop_name NOT LIKE 'test-%';
  ASSERT v_unclaimed_owners = 0,
    format('%s owner-registered rows left unclaimed by the backfill', v_unclaimed_owners);

  SELECT count(*) INTO v_mismatched
    FROM businesses
   WHERE source = 'owner' AND claimed_by IS DISTINCT FROM owner_id
     AND shop_name NOT LIKE 'test-%';
  ASSERT v_mismatched = 0,
    format('%s backfilled rows have claimed_by != owner_id', v_mismatched);
END $$;

-- ─────────────────── 6. claiming a seeded listing ───────────────────
DO $$
DECLARE
  v_directory UUID;
  v_claimant  UUID;
  v_id        UUID;
  v_ref       TEXT;
  v_src       TEXT;
  v_at        TIMESTAMPTZ;
  v_by        UUID;
  v_owner_now UUID;
BEGIN
  SELECT owner_id INTO v_directory FROM businesses LIMIT 1;
  -- Any second profile stands in for the real claimant.
  SELECT id INTO v_claimant FROM profiles WHERE id <> v_directory LIMIT 1;
  IF v_claimant IS NULL THEN
    RAISE NOTICE 'only one profile present; skipping the claim block';
    RETURN;
  END IF;

  INSERT INTO businesses (owner_id, shop_name, source, source_ref, source_license, status)
  VALUES (v_directory, 'test-claimable', 'osm', 'node/900000006', 'ODbL', 'verified')
  RETURNING id INTO v_id;

  -- Unclaimed on arrival — this is what the app badges on.
  SELECT claimed_at INTO v_at FROM businesses WHERE id = v_id;
  ASSERT v_at IS NULL, 'a freshly seeded listing must start unclaimed';

  -- The claim: ownership transfers, and the claim is stamped.
  UPDATE businesses
     SET owner_id = v_claimant, claimed_by = v_claimant, claimed_at = NOW()
   WHERE id = v_id;

  SELECT source, source_ref, claimed_at, claimed_by, owner_id
    INTO v_src, v_ref, v_at, v_by, v_owner_now
    FROM businesses WHERE id = v_id;

  ASSERT v_at IS NOT NULL,    'claimed_at was not stamped';
  ASSERT v_by = v_claimant,   'claimed_by does not record the claimant';
  ASSERT v_owner_now = v_claimant, 'ownership did not transfer on claim';

  -- The load-bearing assertion: provenance SURVIVES the claim. It is the audit
  -- trail and the takedown key, not an import flag to be cleared. Losing it
  -- would mean an owner who later asks "why was I listed?" gets no answer, and
  -- the ODbL attribution obligation becomes untraceable.
  ASSERT v_src = 'osm',               format('source was lost on claim: %L', v_src);
  ASSERT v_ref = 'node/900000006',    format('source_ref was lost on claim: %L', v_ref);

  -- And a claimed row may now legitimately carry owner-supplied imagery... but
  -- only once its source says 'owner'. While it still reads 'osm' the guardrail
  -- correctly keeps holding, which is the conservative behaviour we want.
  BEGIN
    UPDATE businesses SET logo_url = 'https://example.com/after-claim.jpg' WHERE id = v_id;
    ASSERT false, 'guardrail stopped applying after a claim while source was still osm';
  EXCEPTION WHEN check_violation THEN
    NULL;  -- expected
  END;
END $$;

-- ─────────────────── 7. the indexes exist ───────────────────
DO $$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT string_agg(i, ', ')
    INTO v_missing
    FROM unnest(ARRAY['businesses_source_ref_key','businesses_unclaimed_idx']) AS i
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_indexes WHERE tablename = 'businesses' AND indexname = i
   );
  ASSERT v_missing IS NULL, format('indexes missing: %s', v_missing);
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL BUSINESS PROVENANCE TESTS PASSED'; END $$;

ROLLBACK;
