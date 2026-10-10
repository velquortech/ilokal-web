import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { encodeBlurhash } from '@/lib/utils/blurhash';
import { extractStoragePath } from '@/lib/utils/storage';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

/**
 * BlurHash placeholders for stored images — see migration
 * `20261010000000_image_blurhashes` for why they are keyed by object.
 *
 * 32px on the long edge is plenty: a 4×3 hash averages the picture into 12
 * colour components, and the encoder is O(pixels × components).
 */
export async function computeBlurhash(image: Buffer): Promise<string> {
  const { data, info } = await sharp(image, { pages: 1 })
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return encodeBlurhash(new Uint8Array(data), info.width, info.height);
}

/**
 * Hash `image` and record it for (bucket, path). Best-effort by contract: a
 * placeholder is decoration, so a failure is logged and never fails the
 * upload that called it.
 */
export async function saveBlurhash(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  image: Buffer,
): Promise<void> {
  try {
    const blurhash = await computeBlurhash(image);
    const { error } = await supabase
      .from('image_blurhashes')
      .upsert({ bucket, path, blurhash }, { onConflict: 'bucket,path' });
    if (error) throw error;
  } catch (error: unknown) {
    console.error(
      `[blurhash] could not save ${bucket}/${path}`,
      formatErrorForLog(error),
    );
  }
}

export interface ImageRef {
  bucket: string;
  /** As stored: a bucket-relative path, or a legacy absolute public URL. */
  pathOrUrl: string | null | undefined;
}

/**
 * One query for every placeholder a response needs. Returns a lookup by the
 * same `ImageRef` the caller passed in — `null` where no hash exists yet (an
 * image uploaded before this shipped and not backfilled), which the app treats
 * as "no placeholder", exactly as before.
 */
export async function getBlurhashes(
  supabase: SupabaseClient,
  refs: ImageRef[],
): Promise<(ref: ImageRef) => string | null> {
  const keyOf = (bucket: string, path: string) => `${bucket}\u0000${path}`;
  const pathOf = (ref: ImageRef) =>
    ref.pathOrUrl ? extractStoragePath(ref.pathOrUrl, ref.bucket) : null;

  const paths = [
    ...new Set(refs.map(pathOf).filter((p): p is string => Boolean(p))),
  ];
  const found = new Map<string, string>();
  if (paths.length > 0) {
    const { data, error } = await supabase
      .from('image_blurhashes')
      .select('bucket, path, blurhash')
      .in('path', paths);
    if (error) {
      // Placeholders are optional: degrade to none rather than fail the feed.
      console.error('[blurhash] lookup failed', formatErrorForLog(error));
    }
    for (const row of (data ?? []) as {
      bucket: string;
      path: string;
      blurhash: string;
    }[]) {
      found.set(keyOf(row.bucket, row.path), row.blurhash);
    }
  }

  return (ref) => {
    const path = pathOf(ref);
    return path ? (found.get(keyOf(ref.bucket, path)) ?? null) : null;
  };
}
