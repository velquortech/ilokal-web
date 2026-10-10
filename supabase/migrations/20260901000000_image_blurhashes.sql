-- BlurHash placeholders for stored images.
--
-- WHY: the mobile app renders `placeholder={{ blurhash }}` (expo-image) for
-- shop logos and hero photos and has been reading `blur_hash` /
-- `hero_blur_hash` from the nearby feed since launch, but the backend never
-- produced one — every card showed an empty box until its photo downloaded.
--
-- ONE table keyed by the object itself (bucket + bucket-relative path), not a
-- column per image slot on `businesses`:
--   - a hash follows its image, so reordering a gallery or swapping a logo
--     needs no bookkeeping — the new hero's hash is already there;
--   - every image type (products, deals, events) can use it with no schema
--     change;
--   - it is written in exactly one place, `uploadWebP`, the helper every image
--     upload already goes through, plus a backfill for existing objects.

CREATE TABLE IF NOT EXISTS public.image_blurhashes (
  bucket     TEXT        NOT NULL,
  path       TEXT        NOT NULL,
  blurhash   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, path),
  -- A 4×3 hash is 28 characters; 9×9 (the format's maximum) is 166.
  CONSTRAINT image_blurhashes_length CHECK (char_length(blurhash) BETWEEN 6 AND 166)
);

COMMENT ON TABLE public.image_blurhashes IS
  'BlurHash per stored image, keyed by storage bucket + bucket-relative path. Written by uploadWebP and scripts/backfill-blurhashes.ts; served to the mobile app as placeholders.';

ALTER TABLE public.image_blurhashes ENABLE ROW LEVEL SECURITY;

-- Public, like the images themselves (every bucket here is public-read). A
-- hash is a ~28-character blur of a picture anyone can already download.
DROP POLICY IF EXISTS "Public read image blurhashes" ON public.image_blurhashes;
CREATE POLICY "Public read image blurhashes"
  ON public.image_blurhashes FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes follow the storage buckets' own ownership rule: the first folder of
-- the path is the business (or user) the object belongs to. Insert AND update,
-- because uploads use upsert (a replaced logo keeps its path).
DROP POLICY IF EXISTS "Owners write image blurhashes" ON public.image_blurhashes;
CREATE POLICY "Owners write image blurhashes"
  ON public.image_blurhashes FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR split_part(path, '/', 1) = (SELECT auth.uid())::text
    OR split_part(path, '/', 1) IN (
      SELECT b.id::text FROM public.businesses b
       WHERE b.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners update image blurhashes" ON public.image_blurhashes;
CREATE POLICY "Owners update image blurhashes"
  ON public.image_blurhashes FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR split_part(path, '/', 1) = (SELECT auth.uid())::text
    OR split_part(path, '/', 1) IN (
      SELECT b.id::text FROM public.businesses b
       WHERE b.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR split_part(path, '/', 1) = (SELECT auth.uid())::text
    OR split_part(path, '/', 1) IN (
      SELECT b.id::text FROM public.businesses b
       WHERE b.owner_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.image_blurhashes TO anon, authenticated;
GRANT INSERT, UPDATE ON public.image_blurhashes TO authenticated;
