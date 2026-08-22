import { SupabaseClient } from '@supabase/supabase-js';
import { publicStorageUrl } from '@/lib/utils/storage';

/**
 * Resolve a stored image value to a public URL.
 *
 * Seeds store full public URLs; real registrations store raw storage paths.
 * This resolves either form without double-encoding — which is not a
 * theoretical concern: `getPublicUrl` runs `encodeURI` over the whole URL, so
 * handing it an already-encoded path yields `%2520` and a 400. See
 * `lib/utils/storage.ts`.
 *
 * The logic lives in `lib/utils/storage.ts` because the WRITE side needs the
 * same normalisation, and four hand-copied versions of this function is how the
 * encoding bug survived a fix.
 */
export function resolveStorageUrl(
  supabase: SupabaseClient,
  bucket: string,
  pathOrUrl: string | null | undefined,
): string | null {
  return publicStorageUrl(supabase.storage, bucket, pathOrUrl);
}
