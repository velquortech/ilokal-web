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
