/* global console */
/**
 * Generates the maskable PWA icon from the brand app icon.
 *
 * Android does not render a home-screen icon as given: it applies a mask —
 * circle, squircle, rounded square, teardrop, depending on the launcher — and
 * the spec reserves a **40% safe zone**, i.e. only the middle 80% of the
 * canvas along each axis is guaranteed to survive. Every icon in
 * `public/brand/icon/` is full-bleed, so declaring one of them `maskable`
 * would slice the submark's edges off on most devices.
 *
 * So the maskable cut is the existing 512 composited at 60% onto an opaque
 * Brick Ember field — comfortably inside the safe zone, with the brand colour
 * doing the work the mask would otherwise do to the artwork.
 *
 * It is a SEPARATE file from the `"any"` icon on purpose. One icon declared as
 * both is masked in the launcher AND used unmasked in the install dialog and
 * the task switcher, so it is padded where it should be full-bleed. Two
 * entries, two files, each right where it is used.
 *
 * Run: `node scripts/build-maskable-icon.mjs`
 * Committed output: `public/brand/icon/app-icon-maskable-512.png`
 */
import sharp from 'sharp';

const SIZE = 512;
/** 60% of the canvas — inside the 80% the mask guarantees, with margin. */
const LOGO_SCALE = 0.6;
/** Brick Ember. Matches `--brand` and the manifest's `theme_color`. */
const FIELD = { r: 0xd7, g: 0x00, b: 0x05, alpha: 1 };

const logoSize = Math.round(SIZE * LOGO_SCALE);

// The mark has to be the light cut — Brick Ember on Brick Ember would be
// invisible. `app-icon-reversed-1024` is the Jasmine mark on a full-bleed
// Brick Ember tile.
//
// It is TRIMMED first, and that step is load-bearing: the source is a square
// tile whose mark is a wide lockup (799×391 of 1024²), so resizing the tile to
// 60% would shrink the mark to ~47% of the canvas and leave a brick tile on a
// brick field — padding on top of padding, for a mark that ends up smaller
// than it needs to be. Trimming to the mark's own bounding box means the 60%
// is spent on the artwork.
const logo = await sharp('public/brand/icon/app-icon-reversed-1024.png')
  .trim({ threshold: 10 })
  .resize(logoSize, logoSize, { fit: 'inside', withoutEnlargement: false })
  .toBuffer();

const logoMeta = await sharp(logo).metadata();
const left = Math.round((SIZE - (logoMeta.width ?? logoSize)) / 2);
const top = Math.round((SIZE - (logoMeta.height ?? logoSize)) / 2);

await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: FIELD,
  },
})
  .composite([{ input: logo, top, left }])
  .png()
  .toFile('public/brand/icon/app-icon-maskable-512.png');

console.log(
  `wrote public/brand/icon/app-icon-maskable-512.png (${SIZE}px, mark ${logoMeta.width}×${logoMeta.height} at ${left},${top})`,
);
