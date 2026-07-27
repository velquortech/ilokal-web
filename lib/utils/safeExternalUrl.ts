/**
 * Guards for rendering owner-supplied contact details as links.
 *
 * WHY THIS EXISTS: `urlOrEmpty` in `lib/validation/settings.ts` was
 * `z.string().url()`, and Zod's `url()` is backed by `new URL()` — which
 * ACCEPTS `javascript:alert(1)` as a perfectly valid URL. Nothing rendered
 * those columns, so it was inert; the moment a shop's website/social links
 * become `href`s on the public profile it is stored XSS, authored by the shop
 * owner and aimed at every visitor.
 *
 * The schema is now tightened too, but this render-side guard is the one that
 * matters: rows written before that change, and any admin edit that bypasses
 * Zod, are still in the table. Never trust the column.
 *
 * Same defensive shape as `safeNext`: an allowlist, not a blocklist.
 */

/**
 * ASCII control characters. The WHATWG URL parser STRIPS tab/CR/LF before
 * parsing, so `java\tscript:alert(1)` parses as `javascript:` — a blocklist on
 * the raw string would miss it. Reject them outright instead.
 */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[\x00-\x1f\x7f]/;

/** The only schemes that may ever reach an `href`. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Returns the URL if it is a safe absolute http(s) link, else `null`.
 *
 * Callers render nothing when this returns null — a shop with a malformed
 * link shows no link, never a broken or dangerous one.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const value = raw.trim();
  if (!value || FORBIDDEN_CHARS.test(value)) return null;

  // Protocol-relative (`//evil.com`) has no scheme of its own — it inherits
  // the page's, so it would resolve and navigate off-site.
  if (value.startsWith('//')) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    // Relative or unparseable. A bare "facebook.com/shop" is a plausible
    // owner mistake, but guessing a scheme for them means guessing where the
    // link goes — decline instead.
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
  // `http://` with no host parses, and links nowhere.
  if (!parsed.hostname) return null;

  return parsed.toString();
}

/** Host without `www.`, for compact display ("ilokal.shop"). */
export function displayUrlLabel(raw: string | null | undefined): string | null {
  const safe = safeExternalUrl(raw);
  if (!safe) return null;
  try {
    return new URL(safe).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * `contact_phone_public` is free text (max 20 chars), so it cannot go into a
 * `tel:` href as-is. Keep digits and a single leading `+`; require enough
 * digits to be a real number.
 */
export function safeTelHref(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const value = raw.trim();
  if (!value) return null;

  const hasPlus = value.startsWith('+');
  const digits = value.replace(/\D/g, '');

  // Shortest plausible local number; also rejects a stray "+" or punctuation.
  if (digits.length < 7 || digits.length > 15) return null;

  return `tel:${hasPlus ? '+' : ''}${digits}`;
}
