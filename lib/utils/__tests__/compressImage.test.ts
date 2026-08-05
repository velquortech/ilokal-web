/**
 * The upload compressor.
 *
 * The rule that matters most is not "does it shrink things" — it is that it can
 * never make an upload WORSE than before it existed. Every failure path has to
 * hand back the original file so the existing size validation still does its
 * job; a compressor that throws would turn a rejected upload into a broken
 * form, and one that returns a bigger file would push a passing upload over the
 * cap.
 *
 * The canvas encode is injected. happy-dom has no `createImageBitmap` and no
 * canvas, and the stack is frozen, so the alternative to a seam here is no test
 * at all.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  compressImage,
  describeCompression,
  isAnimated,
  MAX_UPLOAD_BYTES,
  COMPRESSION_PRESETS,
  type Encoder,
} from '../compressImage';

const MB = 1024 * 1024;

const makeFile = (bytes: number, type = 'image/jpeg', name = 'photo.jpg') =>
  new File([new Uint8Array(bytes)], name, { type });

/** An encoder whose output size is a fixed fraction of the requested quality. */
const encoderReturning = (sizeFor: (quality: number) => number): Encoder =>
  vi.fn(async (_file, _dimension, quality) => {
    const size = sizeFor(quality);
    return new Blob([new Uint8Array(size)], { type: 'image/webp' });
  });

describe('files it must not touch', () => {
  it('leaves a file that already fits', async () => {
    const file = makeFile(MB);
    const encoder = encoderReturning(() => 1);

    const result = await compressImage(file, { encoder });

    expect(result.outcome).toBe('already-small');
    expect(result.file).toBe(file);
    expect(encoder).not.toHaveBeenCalled();
  });

  it('leaves a PDF alone', async () => {
    // The licence / tax-certificate path uploads raw bytes; re-encoding a
    // document would corrupt it.
    const file = makeFile(5 * MB, 'application/pdf', 'permit.pdf');

    const result = await compressImage(file, {
      encoder: encoderReturning(() => 1),
    });

    expect(result.outcome).toBe('not-an-image');
    expect(result.file).toBe(file);
  });

  it('leaves HEIC alone, because no browser can decode it', async () => {
    const file = makeFile(4 * MB, 'image/heic', 'IMG_0001.HEIC');

    const result = await compressImage(file, {
      encoder: encoderReturning(() => 1),
    });

    expect(result.outcome).toBe('undecodable');
    expect(result.file).toBe(file);
  });

  it('leaves an animated GIF alone', async () => {
    // Canvas captures one frame, and the server's `convertToWebP` deliberately
    // PRESERVES animation — flattening here would be a silent regression.
    const bytes = new Uint8Array(3 * MB);
    // Two Graphic Control Extension blocks = animated.
    bytes.set([0x21, 0xf9, 0x04], 10);
    bytes.set([0x21, 0xf9, 0x04], 500);
    const file = new File([bytes], 'spin.gif', { type: 'image/gif' });

    const result = await compressImage(file, {
      encoder: encoderReturning(() => 1),
    });

    expect(result.outcome).toBe('animated');
    expect(result.file).toBe(file);
  });

  it('treats a single-frame GIF as compressible', async () => {
    const bytes = new Uint8Array(3 * MB);
    bytes.set([0x21, 0xf9, 0x04], 10);
    const file = new File([bytes], 'still.gif', { type: 'image/gif' });

    await expect(isAnimated(file)).resolves.toBe(false);
  });
});

describe('compressing', () => {
  it('starts high, because the server re-encodes anyway', async () => {
    // This pass only has to clear the transport cap; the server owns the
    // stored artefact at quality 80. Quality given away here is given away
    // twice.
    const file = makeFile(5 * MB);
    const encoder = encoderReturning(() => MB);

    await compressImage(file, { encoder });

    const firstQuality = (encoder as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(firstQuality).toBeGreaterThanOrEqual(0.9);
  });

  it('shrinks an oversized photo and reports both sizes', async () => {
    const file = makeFile(5 * MB);
    const encoder = encoderReturning(() => MB);

    const result = await compressImage(file, { encoder });

    expect(result.outcome).toBe('compressed');
    expect(result.file.size).toBe(MB);
    expect(result.originalSize).toBe(5 * MB);
    expect(result.file.type).toBe('image/webp');
    expect(result.file.name).toBe('photo.webp');
  });

  it('steps down the quality ladder only as far as it needs to', async () => {
    const file = makeFile(5 * MB);
    // Fits on the second rung.
    const encoder = encoderReturning((quality) =>
      quality >= 0.92 ? 3 * MB : MB,
    );

    const result = await compressImage(file, { encoder });

    expect(result.outcome).toBe('compressed');
    expect(encoder).toHaveBeenCalledTimes(2);
  });

  it('halves the dimension cap before giving up', async () => {
    const file = makeFile(9 * MB);
    const encoder: Encoder = vi.fn(async (_f, dimension) => {
      // Only the second, smaller pass fits.
      const size = dimension === COMPRESSION_PRESETS.hero ? 3 * MB : MB;
      return new Blob([new Uint8Array(size)], { type: 'image/webp' });
    });

    const result = await compressImage(file, {
      encoder,
      maxDimension: COMPRESSION_PRESETS.hero,
    });

    expect(result.outcome).toBe('compressed');
    const dimensions = (encoder as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[1],
    );
    expect(dimensions).toContain(COMPRESSION_PRESETS.hero);
    expect(dimensions).toContain(COMPRESSION_PRESETS.hero / 2);
  });

  it('honours a caller’s own ceiling', async () => {
    const file = makeFile(3 * MB);
    const encoder = encoderReturning(() => 900 * 1024);

    const result = await compressImage(file, { encoder, maxBytes: 1 * MB });

    expect(result.outcome).toBe('compressed');
    expect(result.file.size).toBeLessThanOrEqual(MB);
  });
});

describe('never makes it worse', () => {
  it('rejects an encode that came back bigger, rather than accepting it', async () => {
    // Re-encoding an already-optimised JPEG can INFLATE it. Such a result is
    // necessarily above the cap (we only compress files that are), so it fails
    // the size test and falls through the ladder rather than being returned.
    const file = makeFile(3 * MB);
    const encoder = encoderReturning(() => 4 * MB);

    const result = await compressImage(file, { encoder, maxBytes: 2 * MB });

    expect(result.outcome).toBe('failed');
    expect(result.file).toBe(file);
  });

  it('returns the original when the encoder yields nothing', async () => {
    const file = makeFile(5 * MB);
    const encoder: Encoder = vi.fn(async () => null);

    const result = await compressImage(file, { encoder });

    expect(result.outcome).toBe('failed');
    expect(result.file).toBe(file);
  });

  it('returns the original when the encoder throws', async () => {
    // No decoder, no canvas, out of memory. The form must still work.
    const file = makeFile(5 * MB);
    const encoder: Encoder = vi.fn(async () => {
      throw new Error('no decode');
    });

    const result = await compressImage(file, { encoder });

    expect(result.outcome).toBe('failed');
    expect(result.file).toBe(file);
  });

  it('returns the original when even the smallest pass is too big', async () => {
    const file = makeFile(40 * MB);
    const encoder = encoderReturning(() => 10 * MB);

    const result = await compressImage(file, { encoder });

    expect(result.outcome).toBe('failed');
    expect(result.file).toBe(file);
    // Two dimension passes × five quality rungs.
    expect(encoder).toHaveBeenCalledTimes(10);
  });
});

describe('what the user is told', () => {
  it('names both sizes after a successful resize', () => {
    const message = describeCompression({
      file: makeFile(900 * 1024),
      outcome: 'compressed',
      originalSize: 5 * MB,
    });

    expect(message).toContain('5.0 MB');
    expect(message).toContain('0.9 MB');
  });

  it('names the format for a HEIC photo instead of blaming the size', () => {
    const message = describeCompression({
      file: makeFile(4 * MB, 'image/heic'),
      outcome: 'undecodable',
      originalSize: 4 * MB,
    });

    expect(message).toContain('HEIC');
    expect(message).toContain('JPEG');
  });

  it('says nothing when there is nothing to say', () => {
    expect(
      describeCompression({
        file: makeFile(1),
        outcome: 'already-small',
        originalSize: 1,
      }),
    ).toBeNull();
  });
});

describe('the shared ceiling', () => {
  it('is the 2 MB every validator enforces', () => {
    expect(MAX_UPLOAD_BYTES).toBe(2 * 1024 * 1024);
  });
});
