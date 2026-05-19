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
  return supabase.storage.from(bucket).getPublicUrl(pathOrUrl).data.publicUrl;
}
