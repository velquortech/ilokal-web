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

/**
 * True when an sfnt carries an `fvar` table, i.e. it is a VARIABLE font.
 *
 * Satori cannot render one — it throws `Cannot read properties of undefined`
 * part-way through parsing, which would take out the whole image rather than
 * degrade. Fontshare's Pally zip ships `Pally-Variable.ttf` alongside the
 * static cuts, and the variable file is the easier one to grab by mistake, so
 * this is checked rather than hoped for.
 *
 * Reads the table directory directly: 12-byte header, then 16 bytes per table
 * with the 4-byte tag first. No parsing library needed for a tag scan.
 */
export function isVariableFont(data: Buffer): boolean {
  if (data.length < 12) return false;
  const numTables = data.readUInt16BE(4);
  // A malformed directory would make this loop read past the buffer.
  if (numTables === 0 || 12 + numTables * 16 > data.length) return false;
  for (let i = 0; i < numTables; i++) {
    if (data.subarray(12 + i * 16, 16 + i * 16).toString('latin1') === 'fvar') {
      return true;
    }
  }
  return false;
}

async function firstReadable(basenames: string[]): Promise<Buffer | null> {
  for (const base of basenames) {
    for (const ext of READABLE) {
      const file = path.join(ASSETS, `${base}.${ext}`);
      let data: Buffer;
      try {
        data = await readFile(file);
      } catch {
        continue; // A missing optional font is not an error.
      }
      if (isVariableFont(data)) {
        console.warn(
          `[og/fonts] Ignoring ${base}.${ext}: it is a VARIABLE font, which ` +
            'the image renderer cannot parse — it would fail the render rather ' +
            'than degrade. Use the static cut instead (Fontshare ships both: ' +
            'take Fonts/TTF/Pally-Bold.ttf, not Pally-Variable.ttf).',
        );
        continue;
      }
      return data;
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
