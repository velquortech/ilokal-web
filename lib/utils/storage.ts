/**
 * Undo one round of percent-encoding on a storage path.
 *
 * 🔴 This exists because `storage.getPublicUrl()` runs `encodeURI()` over the
 * WHOLE url it builds, and `encodeURI('%20')` is `'%2520'` — `%` is not a
 * character `encodeURI` leaves alone. So an already-encoded value stored in the
 * database is encoded a SECOND time on every read, and the resulting url 400s.
 * Verified against the live bucket:
 *
 *   …/1786278978809-Screenshot%202026-08-08%20095928.webp    → 200
 *   …/1786278978809-Screenshot%25202026-08-08%2520095928.webp → 400
 *
 * The encoded values got in there through `extractStoragePath`, which used to
 * slice a public url as a plain string and hand back the encoded remainder as
 * if it were a path (see this file's git history). Production holds four such
 * rows on one shop — every gallery photo that shop uploaded, invisible on the
 * page while sitting intact in the bucket.
 *
 * **One round, and only when it changes something.** A real object whose name
 * genuinely contains the four characters `%20` is indistinguishable from an
 * encoded space, and this app's upload path can no longer produce one
 * (`safeObjectName`). Between "render the owner's photo" and "honour a
 * filename nothing here can create", the photo wins.
 */
export function decodeStoragePath(path: string): string {
  // Cheap guard: no `%XX` sequence means there is nothing to undo, so a
  // filename containing a bare `%` is never touched.
  if (!/%[0-9A-Fa-f]{2}/.test(path)) return path;
  try {
    return decodeURIComponent(path);
  } catch {
    // Malformed encoding (a lone `%`). Leave it exactly as stored rather than
    // half-rewriting a value we failed to parse.
    return path;
  }
}

/**
 * Extracts the relative storage path from a Supabase public URL.
 *
 * Supabase public URLs have the form:
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 *
 * Returns the <path> segment, or the input itself if it is already a relative path.
 * Returns null when the URL is empty or the bucket marker is not found.
 *
 * The path is DECODED — a url carries `%20` where the object name carries a
 * space, and the object name is what `storage.remove()` and `getPublicUrl()`
 * both take. See `decodeStoragePath` for what returning the encoded form cost.
 */
export function extractStoragePath(
  urlOrPath: string,
  bucket: string,
): string | null {
  if (!urlOrPath) return null;

  // Already a relative path. Still normalised, because the rows written before
  // this fix hold encoded paths and they have to compare equal to the same
  // file arriving as a url.
  if (!urlOrPath.startsWith('http')) return decodeStoragePath(urlOrPath);

  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) return null;

  return decodeStoragePath(urlOrPath.slice(idx + marker.length));
}

/**
 * Build a public url for a stored value, whichever representation it is in.
 *
 * ⚠️ THE one place this conversion happens. It existed in four hand-copied
 * versions (`app/api/helpers/storage.ts`, two closures in
 * `lib/api/business/business.ts`, one in `lib/api/business/businessQuery.ts`),
 * which is precisely how the double-encoding bug above could be present in all
 * of them and fixable in none — CLAUDE.md §DRY, paid for again.
 *
 * Seeds and the older upload routes store an absolute public url; registration
 * and every current write store a bucket-relative path. An absolute url is
 * returned verbatim: it is already encoded, and re-deriving it would only
 * re-introduce the double-encode.
 */
export function publicStorageUrl(
  storage: {
    from: (bucket: string) => {
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  },
  bucket: string,
  pathOrUrl: string | null | undefined,
): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  return storage.from(bucket).getPublicUrl(decodeStoragePath(pathOrUrl)).data
    .publicUrl;
}

/**
 * Object key for a newly uploaded file.
 *
 * The key is the ROOT of the encoding problem `decodeStoragePath` cleans up
 * after: the upload routes used to interpolate the owner's own filename, so a
 * screenshot arrived as `…-Screenshot 2026-08-08 095928.webp` and every layer
 * downstream had to agree on how to spell that space. They did not.
 *
 * Collapses everything outside `[A-Za-z0-9._-]` to a single `-`, which is the
 * rule `app/api/protected/mobile/me/avatar/route.ts` already applied on its
 * own — this is that rule, shared, so the other six upload routes get it too.
 * The extension is preserved by the caller (`toWebPFilename` runs first).
 */
export function safeObjectName(fileName: string): string {
  const cleaned = fileName
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    // Leading dots would make the object hidden-ish and `..` traversal-shaped;
    // a trailing dash is just untidy.
    .replace(/^[.-]+/, '')
    .replace(/-+$/, '');
  // Every caller prefixes a timestamp, so an empty result is still a usable
  // key — but a bare timestamp with no extension is not, so keep a fallback.
  return cleaned || 'file';
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
