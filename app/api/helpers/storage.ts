import { SupabaseClient } from '@supabase/supabase-js';

// Seeds store full public URLs; real registrations store raw storage paths.
// This resolves either form to a full public URL without double-encoding.
export function resolveStorageUrl(
  supabase: SupabaseClient,
  bucket: string,
  pathOrUrl: string | null | undefined,
): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  // Uploads can persist their paths percent-encoded ("Screenshot%202026-…")
  // while the storage object itself keeps the raw name ("Screenshot 2026-…").
  // getPublicUrl re-encodes whatever it's given, so passing the encoded form
  // through would double-encode the "%" (…%2520…) and the URL 404s. Decode the
  // stored path once so getPublicUrl applies exactly one layer of encoding and
  // the URL matches the real object key.
  let path = pathOrUrl;
  try {
    path = decodeURIComponent(pathOrUrl);
  } catch {
    // Not valid percent-encoding (e.g. a literal "%" in a filename) — pass
    // through untouched rather than crashing the request.
  }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
