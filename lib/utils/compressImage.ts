/**
 * Browser-side image compression, so a phone photo can be uploaded at all.
 *
 * The 2 MB cap is a TRANSPORT limit, not a rule about the picture: Server
 * Actions cap at 3 MB (`next.config.ts`) and Vercel functions at 4.5 MB. The
 * server already downscales every display image to WebP at write time
 * (`lib/api/helpers/image.ts`) — it just never got the chance, because a 3–6 MB
 * photo was rejected before it could be sent. This is what lets the file reach
 * that pipeline.
 *
 * Native only — `createImageBitmap` + `<canvas>` — because the stack is frozen.
 *
 * **It never throws and never makes things worse.** Every failure path returns
 * the ORIGINAL file, so the existing size validation still applies and a broken
 * decode can never break the form.
 */

/** The one upload ceiling. Every validator and route should import this. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/**
 * Longest-edge caps, mirroring the server's `IMAGE_PRESETS` so the two cannot
 * drift into producing different pictures.
 */
export const COMPRESSION_PRESETS = {
  avatar: 512,
  logo: 512,
  product: 1200,
  hero: 1600,
  interior: 1600,
} as const;

/**
 * Tried in order until the result fits. A fixed ladder rather than a binary
 * search: a search costs ~7 encodes of a full-resolution bitmap on a phone, the
 * ladder costs at most 4, and they land within a few percent of each other.
 *
 * It starts HIGH on purpose. This pass exists only to get the file under the
 * transport cap — the server re-encodes at quality 80 and owns the stored
 * artefact — so every point of quality given away here is given away twice.
 * Starting at 0.92 hands the server a cleaner source at almost the same
 * transport size; the lower rungs are there for photos that need them.
 */
const QUALITY_LADDER = [0.92, 0.82, 0.7, 0.6, 0.5] as const;

/** Browsers cannot decode these, so there is nothing to compress. */
const UNDECODABLE = ['image/heic', 'image/heif'];

export interface CompressImageOptions {
  /** Target ceiling. Defaults to the upload cap. */
  maxBytes?: number;
  /** Longest edge in px. Use `COMPRESSION_PRESETS`. */
  maxDimension?: number;
  /** Output type. WebP by default — it keeps alpha, unlike JPEG. */
  mimeType?: 'image/webp' | 'image/jpeg';
  /** Test seam. Production passes nothing and uses the canvas encoder. */
  encoder?: Encoder;
}

export interface Encoder {
  (
    file: File,
    maxDimension: number,
    quality: number,
    mimeType: string,
  ): Promise<Blob | null>;
}

/** Why a file was left alone — surfaced so the UI can say something true. */
export type CompressionOutcome =
  | 'compressed'
  | 'already-small'
  | 'not-an-image'
  | 'undecodable'
  | 'animated'
  | 'failed';

export interface CompressionResult {
  file: File;
  outcome: CompressionOutcome;
  /** Bytes before, for a message that can say what actually happened. */
  originalSize: number;
}

/**
 * True when the bytes carry more than one frame.
 *
 * Canvas captures a single frame, and `convertToWebP` on the server
 * deliberately PRESERVES animation — so flattening a GIF here would be a
 * silent regression rather than an optimisation. Cheap sniff: an animated GIF
 * has more than one Graphic Control Extension, an animated WebP has an `ANIM`
 * chunk.
 */
export async function isAnimated(file: File): Promise<boolean> {
  try {
    if (file.type === 'image/gif') {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let frames = 0;
      for (let i = 0; i < bytes.length - 3; i++) {
        if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04)
          frames++;
        if (frames > 1) return true;
      }
      return false;
    }
    if (file.type === 'image/webp') {
      const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
      const text = String.fromCharCode(...head);
      return text.includes('ANIM') || text.includes('ANMF');
    }
  } catch {
    // Unreadable bytes: treat as animated, i.e. leave it alone. The size check
    // downstream still applies.
    return true;
  }
  return false;
}

/**
 * Decode → downscale → encode, once, at a given quality.
 *
 * `imageOrientation: 'from-image'` matters: drawing to a canvas DROPS EXIF, so
 * without it an iPhone portrait silently uploads rotated 90°.
 */
const canvasEncoder: Encoder = async (
  file,
  maxDimension,
  quality,
  mimeType,
) => {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });

  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return null;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
};

function renamed(file: File, blob: Blob, mimeType: string): File {
  const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${base}.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

/**
 * Compress `file` to under `maxBytes` if it is over, and if it can be.
 *
 * Always resolves. See `CompressionResult.outcome` for what happened.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<CompressionResult> {
  const {
    maxBytes = MAX_UPLOAD_BYTES,
    maxDimension = COMPRESSION_PRESETS.hero,
    mimeType = 'image/webp',
    encoder = canvasEncoder,
  } = options;

  const unchanged = (outcome: CompressionOutcome): CompressionResult => ({
    file,
    outcome,
    originalSize: file.size,
  });

  if (!file.type.startsWith('image/')) return unchanged('not-an-image');
  if (UNDECODABLE.includes(file.type)) return unchanged('undecodable');
  if (file.size <= maxBytes) return unchanged('already-small');
  if (await isAnimated(file)) return unchanged('animated');

  try {
    // Two passes: the requested dimension cap, then half of it. A photo of a
    // dim interior can stay above budget at every quality yet fit easily one
    // size down, and half is where the visible cost is still acceptable.
    for (const dimension of [maxDimension, Math.round(maxDimension / 2)]) {
      for (const quality of QUALITY_LADDER) {
        const blob = await encoder(file, dimension, quality, mimeType);
        if (!blob) return unchanged('failed');

        // No "is it actually smaller?" guard is needed: this runs only when
        // `file.size > maxBytes`, so anything accepted here is below the cap
        // and therefore below the original by construction. Re-encoding CAN
        // inflate an already-optimised JPEG, but such a result fails this test
        // and falls through the ladder instead.
        if (blob.size <= maxBytes) {
          return {
            file: renamed(file, blob, mimeType),
            outcome: 'compressed',
            originalSize: file.size,
          };
        }
      }
    }

    // Still too big at half size and lowest quality — a genuinely enormous
    // image. The caller's size check gives the user the honest answer.
    return unchanged('failed');
  } catch {
    // No decoder (HEIC in Chrome), no canvas, a tainted context, out of
    // memory: the original goes through and normal validation applies.
    return unchanged('failed');
  }
}

/**
 * One line for the user, in the interface's voice.
 *
 * Only the cases worth mentioning return text — a file that was already small
 * needs no announcement, and saying "not an image" here would duplicate the
 * type validation that already runs.
 */
export function describeCompression(
  result: CompressionResult,
  maxLabel = '2 MB',
): string | null {
  const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  switch (result.outcome) {
    case 'compressed':
      return `Resized from ${mb(result.originalSize)} to ${mb(result.file.size)}.`;
    case 'undecodable':
      return `This looks like a HEIC photo, which browsers can’t resize. Save or export it as JPEG first.`;
    case 'animated':
      return `Animated images can’t be resized — this one needs to be under ${maxLabel}.`;
    case 'failed':
      return `We couldn’t resize this one. Try a smaller image, under ${maxLabel}.`;
    default:
      return null;
  }
}
