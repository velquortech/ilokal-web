/**
 * BlurHash ENCODER (https://blurha.sh, the woltapp/blurhash algorithm, MIT).
 *
 * The mobile app already decodes these natively — expo-image renders
 * `placeholder={{ blurhash }}` — so a hash per image is all it needs to show a
 * soft colour preview instead of an empty grey box while the photo downloads.
 *
 * Encoder only, and in-repo rather than the `blurhash` npm package: the stack is
 * frozen, and encoding is ~60 lines of arithmetic. Deliberately import-free so
 * the backfill script can load this file directly under Node's type stripping
 * (`scripts/backfill-blurhashes.ts`) — no path aliases, no runtime deps.
 */

const BASE83 =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

function encode83(value: number, length: number): string {
  let result = '';
  for (let i = 1; i <= length; i++) {
    const digit = Math.floor(value / 83 ** (length - i)) % 83;
    result += BASE83[digit];
  }
  return result;
}

function sRGBToLinear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linearToSRGB(value: number): number {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308
    ? Math.trunc(v * 12.92 * 255 + 0.5)
    : Math.trunc((1.055 * v ** (1 / 2.4) - 0.055) * 255 + 0.5);
}

const signPow = (value: number, exp: number) =>
  Math.sign(value) * Math.abs(value) ** exp;

/**
 * Encode RGBA pixels (4 bytes per pixel, row-major) as a BlurHash.
 *
 * `componentsX`/`componentsY` (1–9) set the detail; 4×3 is the usual choice
 * for photos and keeps the hash at 28 characters. Callers should downscale
 * first — 32×32 pixels is plenty and keeps this O(w·h·cx·cy) loop cheap.
 */
export function encodeBlurhash(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  componentsX = 4,
  componentsY = 3,
): string {
  if (
    componentsX < 1 ||
    componentsX > 9 ||
    componentsY < 1 ||
    componentsY > 9
  ) {
    throw new Error('BlurHash components must be between 1 and 9');
  }
  if (width * height * 4 !== pixels.length) {
    throw new Error('Pixel buffer does not match width × height × 4');
  }

  const factors: [number, number, number][] = [];
  for (let y = 0; y < componentsY; y++) {
    for (let x = 0; x < componentsX; x++) {
      const normalisation = x === 0 && y === 0 ? 1 : 2;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const basis =
            normalisation *
            Math.cos((Math.PI * x * i) / width) *
            Math.cos((Math.PI * y * j) / height);
          const p = 4 * (i + j * width);
          r += basis * sRGBToLinear(pixels[p]);
          g += basis * sRGBToLinear(pixels[p + 1]);
          b += basis * sRGBToLinear(pixels[p + 2]);
        }
      }
      const scale = 1 / (width * height);
      factors.push([r * scale, g * scale, b * scale]);
    }
  }

  const [dc, ...ac] = factors;
  let hash = encode83(componentsX - 1 + (componentsY - 1) * 9, 1);

  let maximumValue = 1;
  if (ac.length > 0) {
    const actualMax = Math.max(...ac.flat().map(Math.abs));
    const quantisedMax = Math.max(
      0,
      Math.min(82, Math.floor(actualMax * 166 - 0.5)),
    );
    maximumValue = (quantisedMax + 1) / 166;
    hash += encode83(quantisedMax, 1);
  } else {
    hash += encode83(0, 1);
  }

  hash += encode83(
    (linearToSRGB(dc[0]) << 16) +
      (linearToSRGB(dc[1]) << 8) +
      linearToSRGB(dc[2]),
    4,
  );

  for (const [r, g, b] of ac) {
    const quant = (v: number) =>
      Math.max(
        0,
        Math.min(18, Math.floor(signPow(v / maximumValue, 0.5) * 9 + 9.5)),
      );
    hash += encode83(quant(r) * 19 * 19 + quant(g) * 19 + quant(b), 2);
  }

  return hash;
}
