import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Fonts for the server-rendered social posts.
 *
 * ⚠️ **Satori cannot read `.woff2`.** Probed rather than assumed: handing it
 * `assets/fonts/Pally-Bold.woff2` fails with `Unsupported OpenType signature
 * wOF2`, while a `.ttf` renders. It accepts TTF, OTF and WOFF only.
 *
 * `assets/fonts/` currently holds Pally as `.woff2` **only**, because that is
 * what `next/font/local` wants — it reads those at build time and re-emits
 * them hashed. Converting one locally is not a small job either: Pally's woff2
 * stores `glyf` and `loca` in woff2's *transformed* form, so a converter has
 * to rebuild glyph outlines, not just decompress. That is not something to
 * hand-roll for a brand asset.
 *
 * So this module looks for a renderer-readable Pally and falls back to the TTF
 * that ships inside the OG package when it cannot find one. The layout, the
 * logos and the copy are all correct either way — only the typeface is
 * interim, and it becomes correct the moment a `Pally-Bold.ttf` (or `.otf` /
 * `.woff`) is dropped into `assets/fonts/`. No code change needed.
 */

export interface PostFont {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 700;
  style: 'normal';
}

/** The display family the layout asks for. */
export const POST_FONT_FAMILY = 'PostDisplay';

const ASSETS = path.join(process.cwd(), 'assets', 'fonts');

/**
 * The bundled fallback.
 *
 * Vercel ships a `.ttf` inside `@vercel/og` precisely because that is what the
 * renderer can read. Using it means the generator works with nothing fetched
 * and nothing installed.
 */
const FALLBACK_TTF = path.join(
  process.cwd(),
  'node_modules',
  'next',
  'dist',
  'compiled',
  '@vercel',
  'og',
  'Geist-Regular.ttf',
);

/** Formats the renderer will actually parse, best first. */
const READABLE = ['ttf', 'otf', 'woff'] as const;

async function firstReadable(basenames: string[]): Promise<Buffer | null> {
  for (const base of basenames) {
    for (const ext of READABLE) {
      try {
        return await readFile(path.join(ASSETS, `${base}.${ext}`));
      } catch {
        // Next candidate. A missing optional font is not an error.
      }
    }
  }
  return null;
}

let warned = false;

/**
 * Every face the post layout may reference, in fallback order.
 *
 * The list matters beyond the missing-Pally case: Satori falls back **per
 * glyph**, so a name containing `é` — one of the live shops is
 * "Suds & Sips Carwash and Café" — renders from the next font in the list
 * rather than as tofu. That is why the accent needed no glyph audit.
 */
export async function loadPostFonts(): Promise<PostFont[]> {
  const fallback = await readFile(FALLBACK_TTF);

  const bold = await firstReadable(['Pally-Bold']);
  const regular = await firstReadable(['Pally-Regular', 'Pally-Medium']);

  if (!bold && !warned) {
    warned = true;
    console.warn(
      '[og/fonts] No renderer-readable Pally in assets/fonts (only .woff2, ' +
        'which Satori cannot parse). Falling back to the bundled Geist TTF — ' +
        'the posts will render correctly but OFF-BRAND. Drop a Pally-Bold.ttf ' +
        'into assets/fonts/ to fix, no code change required.',
    );
  }

  const fonts: PostFont[] = [
    {
      name: POST_FONT_FAMILY,
      data: bold ?? fallback,
      weight: 700,
      style: 'normal',
    },
    {
      name: POST_FONT_FAMILY,
      data: regular ?? bold ?? fallback,
      weight: 400,
      style: 'normal',
    },
  ];

  // Last resort for glyphs the brand face lacks. Declared under the same
  // family so Satori reaches for it only when the preferred face has no glyph.
  if (bold) {
    fonts.push({
      name: POST_FONT_FAMILY,
      data: fallback,
      weight: 500,
      style: 'normal',
    });
  }

  return fonts;
}

/** True when the brand face is actually in use — surfaced in the admin UI. */
export async function hasBrandFont(): Promise<boolean> {
  return (await firstReadable(['Pally-Bold'])) !== null;
}
