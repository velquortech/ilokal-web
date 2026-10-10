import { describe, expect, it } from 'vitest';
import { encodeBlurhash } from '../blurhash';

/**
 * A reference DECODER, written independently from the BlurHash spec, so the
 * encoder is checked against the format the mobile app actually decodes —
 * not just against itself.
 */
const BASE83 =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';
const decode83 = (s: string) =>
  [...s].reduce((acc, c) => acc * 83 + BASE83.indexOf(c), 0);
const toLinear = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const toSRGB = (v: number) => {
  const c = Math.max(0, Math.min(1, v));
  return Math.round(
    (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255,
  );
};

function decodePixel(hash: string, x: number, y: number, w: number, h: number) {
  const size = decode83(hash[0]);
  const cy = Math.floor(size / 9) + 1;
  const cx = (size % 9) + 1;
  const maxValue = (decode83(hash[1]) + 1) / 166;
  const colors: number[][] = [];
  const dc = decode83(hash.slice(2, 6));
  colors.push([dc >> 16, (dc >> 8) & 255, dc & 255].map(toLinear));
  for (let i = 1; i < cx * cy; i++) {
    const v = decode83(hash.slice(4 + i * 2, 6 + i * 2));
    const q = [Math.floor(v / 361), Math.floor(v / 19) % 19, v % 19];
    colors.push(
      q.map((n) => {
        const t = (n - 9) / 9;
        return Math.sign(t) * t * t * maxValue;
      }),
    );
  }
  const out = [0, 0, 0];
  for (let j = 0; j < cy; j++) {
    for (let i = 0; i < cx; i++) {
      const basis =
        Math.cos((Math.PI * x * i) / w) * Math.cos((Math.PI * y * j) / h);
      const c = colors[i + j * cx];
      for (let k = 0; k < 3; k++) out[k] += c[k] * basis;
    }
  }
  return out.map(toSRGB);
}

function solid(w: number, h: number, rgb: [number, number, number]) {
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) px.set([...rgb, 255], i * 4);
  return px;
}

describe('encodeBlurhash', () => {
  it('produces the standard 4×3 shape: 28 base83 characters', () => {
    const hash = encodeBlurhash(solid(8, 8, [10, 20, 30]), 8, 8);
    expect(hash).toHaveLength(4 + 2 * 4 * 3);
    expect([...hash].every((c) => BASE83.includes(c))).toBe(true);
    expect(hash[0]).toBe(BASE83[3 + 2 * 9]); // size flag for 4×3
  });

  it('round-trips a solid colour through a spec decoder', () => {
    const brand: [number, number, number] = [215, 0, 5]; // Brick Ember
    const hash = encodeBlurhash(solid(16, 16, brand), 16, 16);
    const pixel = decodePixel(hash, 8, 8, 16, 16);
    pixel.forEach((c, k) =>
      expect(Math.abs(c - brand[k])).toBeLessThanOrEqual(2),
    );
  });

  it('keeps a left-to-right gradient: dark on the left, light on the right', () => {
    const w = 32;
    const h = 8;
    const px = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = Math.round((x / (w - 1)) * 255);
        px.set([v, v, v, 255], (x + y * w) * 4);
      }
    }
    const hash = encodeBlurhash(px, w, h);
    const left = decodePixel(hash, 1, 4, w, h)[0];
    const right = decodePixel(hash, w - 2, 4, w, h)[0];
    expect(left).toBeLessThan(70);
    expect(right).toBeGreaterThan(185);
  });

  it('rejects a buffer that does not match its dimensions', () => {
    expect(() => encodeBlurhash(new Uint8Array(10), 2, 2)).toThrow();
  });
});
