-- Directory provenance: where a business listing came from, and whether its
-- owner has claimed it.
--
-- WHY
-- ---
-- The open beta has a cold-start problem: `nearby_businesses_filtered` only
-- returns owner-registered businesses, so a new user in Iloilo City opens
-- Explore to a near-empty map. The fix is to pre-seed real local businesses
-- from open data (OpenStreetMap, ODbL) and let owners claim them.
--
-- That makes "where did this row come from?" a load-bearing question for the
-- first time. It is needed for three separate reasons:
--
--   1. **Licence compliance.** ODbL requires attribution for OSM-derived data.
--      We cannot attribute what we cannot identify.
--   2. **Takedown.** If an owner asks to be removed, or an upstream record
--      turns out to be wrong, `source_ref` is the key that finds it again.
--   3. **Honest UI.** An unclaimed listing must be badged as such. Showing
--      seeded data as though the owner put it there misrepresents a
--      relationship we do not have.
--
-- Deliberately NOT a "temporary import flag": `source` and `source_ref` are
-- retained forever, including after a claim. They are the audit trail.
--
-- See also: the importer at `scripts/import-directory.ts`, which is the only
-- thing that writes a non-'owner' source.

ALTER TABLE public.businesses
  -- 'owner'      — registered through the owner wizard. The default, and
  --                correct for every row that existed before this migration.
  -- 'osm'        — OpenStreetMap via Overpass (ODbL).
  -- 'foursquare' — Foursquare OS Places (Apache-2.0). Not used yet; reserved
  --                for the province phase, where OSM coverage thins out.
  -- 'manual'     — entered by staff from a public record (e.g. an LGU business
  --                permit list) or field collection.
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'owner'
    CHECK (source IN ('owner', 'osm', 'foursquare', 'manual')),

  -- The upstream record's stable identifier, verbatim: 'node/123456789' or
  -- 'way/987654321' for OSM, the place id for Foursquare. NULL for 'owner' and
  -- 'manual'. This is what makes re-imports idempotent and takedowns findable.
  ADD COLUMN IF NOT EXISTS source_ref TEXT,

  -- SPDX-ish licence identifier of the upstream data, so the attribution
  -- surface can be generated from the data instead of hand-maintained.
  ADD COLUMN IF NOT EXISTS source_license TEXT,

  -- NULL means unclaimed. Set when an owner proves the business is theirs.
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,

  -- Who claimed it. Normally equal to `owner_id` after a claim, but kept
  -- separate: `owner_id` can later be transferred (sale, staff handover) while
  -- this records who originally proved the claim.
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES public.profiles(id);

-- An owner-registered row is claimed by definition — the person who created it
-- was authenticated as its owner. Backfill so `claimed_at IS NOT NULL` is a
-- reliable "someone vouched for this" test, rather than only ever true for
-- rows that went through the new claim flow.
UPDATE public.businesses
   SET claimed_at = COALESCE(created_at, NOW()),
       claimed_by = owner_id
 WHERE source = 'owner'
   AND claimed_at IS NULL;

-- Idempotent re-imports, and a hard stop against the same upstream record
-- landing twice. Partial, because 'owner'/'manual' rows legitimately share a
-- NULL source_ref and a plain unique index would collapse them.
CREATE UNIQUE INDEX IF NOT EXISTS businesses_source_ref_key
  ON public.businesses (source, source_ref)
  WHERE source_ref IS NOT NULL;

-- The app filters unclaimed listings on hot paths (the badge, and any
-- claimed-only surface), so make that cheap.
CREATE INDEX IF NOT EXISTS businesses_unclaimed_idx
  ON public.businesses (source)
  WHERE claimed_at IS NULL;

COMMENT ON COLUMN public.businesses.source IS
  'Provenance: owner | osm | foursquare | manual. Retained permanently, including after a claim.';
COMMENT ON COLUMN public.businesses.source_ref IS
  'Upstream stable id (e.g. OSM "node/123456789"). The takedown and re-import key. NULL for owner/manual rows.';
COMMENT ON COLUMN public.businesses.source_license IS
  'Licence of the upstream data (e.g. ODbL, Apache-2.0). Drives the attribution surface.';
COMMENT ON COLUMN public.businesses.claimed_at IS
  'NULL = unclaimed. Backfilled to created_at for pre-existing owner-registered rows.';
COMMENT ON COLUMN public.businesses.claimed_by IS
  'Profile that proved the claim. May differ from owner_id after an ownership transfer.';

-- ---------------------------------------------------------------------------
-- Guardrail: seeded listings must never carry third-party imagery.
--
-- Place photos on OSM/Foursquare/Google belong to their contributors and are
-- not sublicensed to us, so copying one is ordinary copyright infringement.
-- `app/api/helpers/storage.ts` (resolveStorageUrl) passes any `http(s)://`
-- value straight through to the client, which means a pasted CDN URL would
-- silently "work" — there is nothing in the read path to stop it.
--
-- So the constraint lives here, at the write boundary, where it cannot be
-- forgotten. A seeded business renders the business-type glyph instead; the
-- mobile BusinessCard hero chain already handles that case (and
-- `supabase/seeds/real_world_gaps.sql` deliberately exercises it).
--
-- NOT VALID so the migration cannot fail on pre-existing data; every row is
-- source='owner' at this point and therefore exempt anyway, but validating
-- separately keeps the lock short on a large table.
-- ---------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_seeded_no_images CHECK (
    source = 'owner'
    OR (
      logo_url IS NULL
      AND banner_url IS NULL
      AND (interior_images IS NULL OR cardinality(interior_images) = 0)
    )
  ) NOT VALID;

ALTER TABLE public.businesses VALIDATE CONSTRAINT businesses_seeded_no_images;
