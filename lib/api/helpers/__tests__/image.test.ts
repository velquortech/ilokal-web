import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';

import {
  convertToWebP,
  toWebPFilename,
  uploadWebP,
  ImageProcessingError,
  IMAGE_PRESETS,
} from '@/lib/api/helpers/image';

// ── fixtures ──────────────────────────────────────────────────────────────
// Real images authored with sharp so the tests exercise actual decode/encode.

async function makeImageFile(
  width: number,
  height: number,
  name = 'img.png',
  type = 'image/png',
): Promise<File> {
  const buf = await sharp({
    create: { width, height, channels: 3, background: { r: 12, g: 90, b: 40 } },
  })
    .png()
    .toBuffer();
  return new File([buf], name, { type });
}

async function meta(buffer: Buffer) {
  return sharp(buffer).metadata();
}

// ── convertToWebP ─────────────────────────────────────────────────────────

describe('convertToWebP', () => {
  it('re-encodes a PNG to WebP', async () => {
    const out = await convertToWebP(await makeImageFile(200, 200));
    expect((await meta(out)).format).toBe('webp');
  });

  it('downscales so the longest edge fits maxDimension, preserving aspect', async () => {
    const out = await convertToWebP(await makeImageFile(2000, 1000), {
      maxDimension: 512,
    });
    const m = await meta(out);
    expect(m.format).toBe('webp');
    expect(m.width).toBe(512); // longest edge clamped
    expect(m.height).toBe(256); // aspect ratio preserved (2:1)
  });

  it('never enlarges an image smaller than maxDimension', async () => {
    const out = await convertToWebP(await makeImageFile(100, 80), {
      maxDimension: 512,
    });
    const m = await meta(out);
    expect(m.width).toBe(100);
    expect(m.height).toBe(80);
  });

  it('does not resize when no maxDimension is given', async () => {
    const out = await convertToWebP(await makeImageFile(900, 700));
    const m = await meta(out);
    expect(m.width).toBe(900);
    expect(m.height).toBe(700);
  });

  it('re-encodes an already-WebP upload so the resize cap still applies (no passthrough)', async () => {
    const webpBuf = await sharp({
      create: {
        width: 1600,
        height: 1600,
        channels: 3,
        background: { r: 1, g: 2, b: 3 },
      },
    })
      .webp()
      .toBuffer();
    const file = new File([webpBuf], 'big.webp', { type: 'image/webp' });
    const out = await convertToWebP(file, { maxDimension: 400 });
    const m = await meta(out);
    expect(m.format).toBe('webp');
    expect(m.width).toBe(400); // a passthrough would have left it at 1600
  });

  it('throws on a corrupt file that passed the MIME check', async () => {
    const bad = new File([Buffer.from('not really an image')], 'x.png', {
      type: 'image/png',
    });
    await expect(convertToWebP(bad)).rejects.toBeTruthy();
  });
});

// ── toWebPFilename ────────────────────────────────────────────────────────

describe('toWebPFilename', () => {
  it('swaps the extension to .webp', () => {
    expect(toWebPFilename('photo.JPG')).toBe('photo.webp');
    expect(toWebPFilename('a.b.c.png')).toBe('a.b.c.webp');
  });

  it('appends .webp when there is no extension', () => {
    expect(toWebPFilename('logo')).toBe('logo.webp');
  });
});

// ── IMAGE_PRESETS ─────────────────────────────────────────────────────────

describe('IMAGE_PRESETS', () => {
  it('keeps small assets small and heroes large, all within a sane range', () => {
    expect(IMAGE_PRESETS.logo).toBeLessThanOrEqual(IMAGE_PRESETS.product);
    expect(IMAGE_PRESETS.product).toBeLessThanOrEqual(IMAGE_PRESETS.hero);
    for (const v of Object.values(IMAGE_PRESETS)) {
      expect(v).toBeGreaterThanOrEqual(256);
      expect(v).toBeLessThanOrEqual(4096);
    }
  });
});

// ── uploadWebP ────────────────────────────────────────────────────────────

function mockSupabase(uploadResult: { data?: unknown; error?: unknown }) {
  const upload = vi.fn().mockResolvedValue(uploadResult);
  const from = vi.fn().mockReturnValue({ upload });
  return { client: { storage: { from } } as never, upload, from };
}

describe('uploadWebP', () => {
  it('converts to webp and uploads with image/webp content type, returning the path', async () => {
    const { client, upload, from } = mockSupabase({
      data: { path: 'biz/logo.webp' },
      error: null,
    });

    const path = await uploadWebP(
      client,
      'business-logos',
      'biz/logo.webp',
      await makeImageFile(800, 800),
      { maxDimension: IMAGE_PRESETS.logo },
    );

    expect(path).toBe('biz/logo.webp');
    expect(from).toHaveBeenCalledWith('business-logos');
    const [, buffer, opts] = upload.mock.calls[0];
    expect(opts.contentType).toBe('image/webp');
    expect((await meta(buffer as Buffer)).format).toBe('webp');
    expect((await meta(buffer as Buffer)).width).toBe(IMAGE_PRESETS.logo); // 800 → 512
  });

  it('passes upsert through', async () => {
    const { client, upload } = mockSupabase({
      data: { path: 'u/avatar.webp' },
      error: null,
    });
    await uploadWebP(
      client,
      'avatars',
      'u/avatar.webp',
      await makeImageFile(64, 64),
      {
        maxDimension: IMAGE_PRESETS.avatar,
        upsert: true,
      },
    );
    expect(upload.mock.calls[0][2].upsert).toBe(true);
  });

  it('throws ImageProcessingError (not the storage path) for a non-decodable image', async () => {
    const { client, upload } = mockSupabase({ data: null, error: null });
    const bad = new File([Buffer.from('garbage')], 'x.webp', {
      type: 'image/webp',
    });
    await expect(
      uploadWebP(client, 'avatars', 'u/x.webp', bad, { maxDimension: 512 }),
    ).rejects.toBeInstanceOf(ImageProcessingError);
    expect(upload).not.toHaveBeenCalled(); // never reached storage
  });

  it('propagates a storage error (caller maps it to a generic 5xx)', async () => {
    const storageError = new Error('row-level security violation');
    const { client } = mockSupabase({ data: null, error: storageError });
    await expect(
      uploadWebP(client, 'avatars', 'u/a.webp', await makeImageFile(64, 64), {
        maxDimension: 512,
      }),
    ).rejects.toBe(storageError);
  });
});
