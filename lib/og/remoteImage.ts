import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Fetching the images a social post draws, safely.
 *
 * ⚠️ **`businesses.logo_url` is attacker-controlled.** The owner policy on
 * `businesses` is `FOR ALL` with no column guard and no CHECK on the column, so
 * a registrant can `PATCH` it to any string through PostgREST; and
 * `resolveStorageUrl` returns anything already starting `http(s)://` verbatim,
 * because seeds store absolute URLs. Handing that straight to the renderer —
 * which fetches every `<img src>` server-side — is a request the attacker
 * chooses and our server makes. The dashboard prompt preselects the two most
 * recent registrations, so nobody has to click a hostile row for it to fire.
 *
 * Everything here therefore happens BEFORE the render, never inside it:
 *
 * - **Origin allowlist.** Only the Supabase storage origin the app itself is
 *   configured with. Not a scheme check, not a substring — `URL.origin`
 *   equality, so `https://evil.com/?x=https://<project>.supabase.co` fails.
 * - **Timeout.** Satori's own fetch has none, so one hanging host pins the
 *   Node request for its whole execution budget.
 * - **Byte cap.** A 4 GB "image" is a memory exhaustion, not a slow render.
 * - **Content type.** `image/*` only.
 *
 * ⚠️ **The renderer cannot read WebP, and every production logo IS WebP.**
 * `convertToWebP` re-encodes every upload, so `shop-logos` holds nothing else —
 * and Satori dies on one with `TypeError: u2 is not iterable`, part-way through
 * its image parser. Reproduced rather than inferred: the same render succeeds
 * with a PNG and throws with a WebP of identical dimensions. This is what took
 * the route down in production, as `FUNCTION_INVOCATION_FAILED` with no log at
 * all, because the throw lands in the streaming body rather than in the
 * handler. So every image is transcoded to PNG here, by the `sharp` the upload
 * pipeline already uses.
 *
 * Every failure returns `null`, which the card layer already handles by drawing
 * initials. A logo that cannot be fetched costs one card its picture; it must
 * never cost the whole post, and it must never take the request with it —
 * `ImageResponse` renders lazily while streaming, so a throw inside the render
 * escapes the handler's `try/catch` after the headers have gone out.
 */

/** Enough for a logo; a legitimate one is orders of magnitude under this. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Longest edge handed to the renderer.
 *
 * The biggest a logo is ever drawn is a little over a third of a 1080px canvas,
 * so anything past this is memory and decode time spent on pixels that are
 * thrown away.
 */
const MAX_IMAGE_EDGE = 1024;

/** Long enough for a cold storage read, short enough not to hold a lambda. */
const FETCH_TIMEOUT_MS = 4000;

/**
 * Origins we will fetch an image from.
 *
 * Both are read because they legitimately differ: `NEXT_IMAGE_PUBLIC_URL` is
 * the storage host `next/image` is configured with, and the Supabase URL is
 * what `getPublicUrl` builds from. A deployment may set either.
 */
function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const value of [
    process.env.NEXT_IMAGE_PUBLIC_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      // A malformed env var narrows the allowlist rather than widening it.
    }
  }
  return origins;
}

/** True when `url` is one we are willing to make a server-side request to. */
export function isAllowedImageUrl(
  url: string | null | undefined,
  origins: Set<string> = allowedOrigins(),
): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  // Origin equality, not host or prefix: a scheme downgrade and a credential
  // prefix (`https://storage@evil.com`) both change the origin.
  return origins.has(parsed.origin);
}

/**
 * Fetches an image and returns it as a `data:` URL, or `null`.
 *
 * A data URL rather than the original: it means the renderer makes no network
 * request at all, so the timeout and the cap above are the only ones that ever
 * need to hold.
 */
export async function fetchImageAsDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!isAllowedImageUrl(url)) {
    if (url) {
      // Worth a line: an owner pointing a logo off-origin is either a
      // misconfiguration or someone probing.
      console.warn('[og/remoteImage] refused an off-origin image', {
        origin: safeOrigin(url),
      });
    }
    return null;
  }

  try {
    const response = await fetch(url as string, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // Nothing here is authenticated, and a redirect could leave the
      // allowlist — the check above only ever saw the first URL.
      redirect: 'error',
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const type = response.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return null;

    // Checked before reading where the server declares it, and again after,
    // because `content-length` is a claim rather than a fact.
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) return null;

    return await toRenderablePng(bytes);
  } catch (error: unknown) {
    // A timeout, a DNS failure, a disallowed redirect. All the same to a card:
    // draw the initials.
    console.warn('[og/remoteImage] image fetch failed', {
      origin: safeOrigin(url),
      error: error instanceof Error ? error.message : 'unknown',
    });
    return null;
  }
}

/**
 * Re-encodes to PNG, which is the only thing the renderer is trusted with here.
 *
 * Not a format check — a transcode. Sniffing the type and rejecting WebP would
 * leave every real logo drawn as initials, since WebP is all the bucket holds.
 * `sharp` decodes WebP, JPEG, AVIF, GIF and SVG, so this also removes the
 * question of what else Satori might choke on, and it is the same decoder the
 * upload path already runs.
 *
 * `failOn: 'none'` because a slightly malformed image that still decodes should
 * produce a logo rather than an initials card; a truly undecodable one throws
 * and is caught.
 */
async function toRenderablePng(bytes: Buffer): Promise<string | null> {
  try {
    const png = await sharp(bytes, { failOn: 'none', animated: false })
      .resize({
        width: MAX_IMAGE_EDGE,
        height: MAX_IMAGE_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (error: unknown) {
    console.warn('[og/remoteImage] could not transcode to PNG', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return null;
  }
}

/** The origin alone, for a log line that cannot echo a full attacker URL. */
function safeOrigin(url: string | null | undefined): string {
  if (!url) return 'none';
  try {
    return new URL(url).origin;
  } catch {
    return 'malformed';
  }
}

/**
 * The brand wordmark, inlined from disk.
 *
 * Read rather than fetched over HTTP. The URL would have to come from
 * somewhere, and the only two candidates are an env var that is genuinely
 * unset in some deploys and `request.nextUrl.origin` — which is derived from
 * the `Host` header, i.e. attacker-controlled, the exact thing the reset-link
 * work fixed. A file read has no origin to get wrong.
 *
 * Cached: the file cannot change between requests within a deployment.
 */
let wordmarkCache: Promise<string | null> | null = null;

export function loadWordmarkDataUrl(): Promise<string | null> {
  wordmarkCache ??= readFile(
    path.join(
      process.cwd(),
      'public',
      'brand',
      'wordmark',
      'ilokal-wordmark-jasmine.png',
    ),
  )
    .then((data) => `data:image/png;base64,${data.toString('base64')}`)
    .catch((error: unknown) => {
      console.error('[og/remoteImage] wordmark unreadable', error);
      // The post loses its lockup but still renders. Failing the whole image
      // over a decorative asset would be the worse trade.
      return null;
    });
  return wordmarkCache;
}
