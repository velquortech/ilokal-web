/**
 * Validate a `?next=` post-auth redirect target. Only same-origin relative
 * paths pass: rejects absolute URLs, protocol-relative `//host`, backslash
 * variants (`/\evil.com` — URL parsing normalizes `\` to `/` for special
 * schemes), and ASCII control characters (the WHATWG parser STRIPS tab/CR/LF
 * before parsing, so `/\t/evil.com` would collapse to protocol-relative
 * `//evil.com`).
 */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[\\\x00-\x1f\x7f]/;

export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    FORBIDDEN_CHARS.test(raw)
  ) {
    return null;
  }
  return raw;
}
