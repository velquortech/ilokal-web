-- Split "who listed this business" from "where its data came from".
--
-- WHY: `source` was carrying two unrelated facts at once. Its values —
-- 'owner' | 'osm' | 'foursquare' | 'manual' — mix the PARTY that created the
-- listing ('owner' = the business itself) with the DATA PROVENANCE of everything
-- else ('osm', 'foursquare'). 'manual' shows the seam plainly: a staff-entered
-- business says where the data came from while leaving who entered it implicit.
--
-- Every predicate written against this column so far asks the *party* question
-- ("is this ours or the owner's?") but is phrased as `source = 'owner'`. That
-- works only because every non-owner value happens to be admin-created today.
-- Adding one new data source — Mapillary, a BPLO dataset, a partner feed —
-- silently makes each of those predicates wrong, with no error to notice it by.
--
-- So: `origin` answers WHO (owner | admin), `source` keeps answering WHERE THE
-- DATA CAME FROM. Predicates move to `origin`; nothing has to enumerate the
-- growing list of data sources ever again.
--
-- The default is 'owner' because owner registration is the normal path — an
-- admin-created row is the exception and the importer sets it explicitly.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'owner';

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_origin_check;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_origin_check CHECK (origin IN ('owner', 'admin'));

-- Backfill: anything not registered by its owner was put there by us.
UPDATE public.businesses SET origin = 'admin' WHERE source IS DISTINCT FROM 'owner';

COMMENT ON COLUMN public.businesses.origin IS
  'WHO listed this business: ''owner'' (registered by the business itself) or '
  '''admin'' (created by iLokal staff, e.g. the open-data directory import). '
  'Distinct from `source`, which records WHERE THE DATA CAME FROM. Use this '
  'column — never `source` — for any "is this ours?" predicate.';

COMMENT ON COLUMN public.businesses.source IS
  'Data provenance of the listing''s content: ''owner'' (supplied by the owner), '
  '''osm'', ''foursquare'', ''manual''. For the party that created the listing, '
  'use `origin`.';

-- Serves the admin-seeded kill switch and the claimed-only feed filter.
CREATE INDEX IF NOT EXISTS businesses_origin_idx
  ON public.businesses (origin)
  WHERE archived_at IS NULL;

-- Re-key the no-images guardrail onto `origin`.
--
-- The rule it enforces is a copyright rule about ADMIN-CREATED listings: we
-- compile facts from open data and never third-party photographs, so a listing
-- we created cannot hold an image until its owner claims it and uploads one.
-- That is a statement about who made the row, so it belongs on `origin`.
-- Keyed on `source` it would wrongly exempt a future admin row whose source is
-- something new, which is exactly the bug this migration exists to prevent.
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_seeded_no_images;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_admin_listed_no_images CHECK (
    origin = 'owner'
    OR (logo_url IS NULL AND banner_url IS NULL
        AND (interior_images IS NULL OR cardinality(interior_images) = 0))
  ) NOT VALID;
ALTER TABLE public.businesses VALIDATE CONSTRAINT businesses_admin_listed_no_images;
