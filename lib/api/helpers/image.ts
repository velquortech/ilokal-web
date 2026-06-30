import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Thrown when an upload that passed the MIME allowlist still can't be decoded as
 * an image (corrupt bytes, truncated file). Callers should map this to a 4xx
 * ("could not process image"), not a 500 — it's a bad request, not a server fault.
 */
export class ImageProcessingError extends Error {
  constructor(message = 'Could not process image') {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

/**
 * Max edge (px) per image role. On upload, images are downscaled to fit within
 * this box (longest edge ≤ value, never enlarged) before WebP encoding.
 *
 * The free Supabase plan has **no on-the-fly image transformation**, so every
 * variant must be sized at write time — otherwise a multi-MB camera original is
 * served full-resolution into an 80px thumbnail, which is the main cause of
 * scroll jank and wasted bandwidth on low-end devices. Each preset keeps retina
 * headroom over the largest on-screen use while cutting originals to tens of KB.
 */
export const IMAGE_PRESETS = {
  /** Logos / avatars — rendered ≤ ~200px even on detail screens. */
  logo: 512,
  avatar: 512,
  /** Catalog product photos — up to a half-width grid cell / product sheet. */
  product: 1200,
  /** Full-bleed hero / interior shots — rendered at full device width. */
  hero: 1600,
} as const;

type ConvertOptions = {
  /** Downscale so the longest edge ≤ this many px (never upscales). */
  maxDimension?: number;
  /** WebP quality 1-100. Default 80 — visually clean, meaningfully smaller. */
  quality?: number;
};

/**
 * Decode any supported upload, optionally downscale, and re-encode as WebP.
 * Animated sources (GIF / animated WebP) keep all frames. Returns a Buffer
 * ready to `.upload(path, buffer, { contentType: 'image/webp' })`.
 *
 * Always re-encodes (no WebP passthrough) so the resize cap is applied even to
 * already-WebP uploads — a 4000px WebP would otherwise bypass downscaling.
 */
export async function convertToWebP(
  file: File,
  options: ConvertOptions = {},
): Promise<Buffer> {
  const { maxDimension, quality = 80 } = options;
  const buffer = Buffer.from(await file.arrayBuffer());
  // Preserve every frame for animated sources; a sharp() without this flag
  // would flatten an animated GIF/WebP to its first frame.
  const animated = file.type === 'image/gif' || file.type === 'image/webp';

  let pipeline = sharp(buffer, { animated });
  if (maxDimension) {
    pipeline = pipeline.resize(maxDimension, maxDimension, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  return pipeline.webp({ quality }).toBuffer();
}

export function toWebPFilename(originalName: string): string {
  return originalName.replace(/\.[^.]+$/, '') + '.webp';
}

/**
 * Convert a display image to WebP (downscaled to the preset) and upload it to
 * `bucket` at `path`. Centralizes the convert → contentType:'image/webp' → upload
 * ceremony so a call site can't forget the content type or the resize cap, and so
 * the encoding contract lives in one place.
 *
 * Throws `ImageProcessingError` (→ map to 4xx) if the file can't be decoded; lets
 * the raw Supabase storage error propagate (→ callers log it server-side and
 * return a generic message, per the error-leakage rule) on an upload failure.
 * Returns the stored object path.
 */
export async function uploadWebP(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
  opts: { maxDimension: number; upsert?: boolean },
): Promise<string> {
  let buffer: Buffer;
  try {
    buffer = await convertToWebP(file, { maxDimension: opts.maxDimension });
  } catch (err) {
    throw new ImageProcessingError(
      err instanceof Error
        ? `Could not process image: ${err.message}`
        : undefined,
    );
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: opts.upsert ?? false,
    });

  if (error) throw error;
  return data.path;
}
