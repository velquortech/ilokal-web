/**
 * Extracts the relative storage path from a Supabase public URL.
 *
 * Supabase public URLs have the form:
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 *
 * Returns the <path> segment, or the input itself if it is already a relative path.
 * Returns null when the URL is empty or the bucket marker is not found.
 */
export function extractStoragePath(
  urlOrPath: string,
  bucket: string,
): string | null {
  if (!urlOrPath) return null;

  // Already a relative path
  if (!urlOrPath.startsWith('http')) return urlOrPath;

  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) return null;

  return urlOrPath.slice(idx + marker.length);
}

/**
 * Which of `current` no longer appears in `next`, as storage paths ready for
 * `storage.remove()`.
 *
 * 🔴 The reason this is a function and not a `Set` difference at the call site:
 * **one column holds two representations of the same file.** Registration
 * writes the raw path `storage.upload()` returns (`business.ts` →
 * `interior_images: [...existing, path]`), while `POST /api/web/upload/*` and
 * every save that follows write the absolute public URL. The read layer hides
 * this — `getBusinessById` / `getBusinessProfileData` resolve paths to URLs on
 * the way out — so a client always hands back URLs.
 *
 * Diffing those URLs against the raw paths in the row therefore matched
 * NOTHING, marked every registration-uploaded photo as removed, and deleted the
 * owner's whole gallery out of the bucket on their first save. Both sides are
 * normalised to a path before comparing, so identity is decided by the file,
 * not by which code path last wrote the string.
 *
 * Entries outside the bucket (a foreign host, a malformed value) normalise to
 * `null` and are dropped rather than deleted — this function only ever returns
 * paths it is confident about.
 */
export function storagePathsToDelete(
  current: readonly string[],
  next: readonly string[],
  bucket: string,
): string[] {
  const keep = new Set(
    next
      .map((entry) => extractStoragePath(entry, bucket))
      .filter((path): path is string => path !== null),
  );

  const dropped = new Set<string>();
  for (const entry of current) {
    const path = extractStoragePath(entry, bucket);
    if (path && !keep.has(path)) dropped.add(path);
  }

  return [...dropped];
}

/**
 * Normalise a gallery to bucket-relative paths for STORAGE in the row.
 *
 * Absolute URLs bake the Supabase project host into the database, which is why
 * the seeds were converted to raw paths in the first place (2026-06-16, "Cloud
 * -portable image URLs") — a row written against local storage renders broken
 * against cloud. Registration already stores paths; writing paths here makes
 * the column one representation instead of two, and the read layer resolves
 * either.
 *
 * A value that is not in this bucket is kept verbatim rather than dropped: a
 * gallery is the owner's data, and silently discarding an entry we failed to
 * parse is worse than storing a string we cannot shorten.
 */
export function toStoragePaths(
  urls: readonly string[],
  bucket: string,
): string[] {
  return urls.map((entry) => extractStoragePath(entry, bucket) ?? entry);
}
