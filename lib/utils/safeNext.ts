/**
 * Validate a `?next=` post-auth redirect target. Only same-origin relative
 * paths pass: rejects absolute URLs, protocol-relative `//host`, and
 * backslash variants (`/\evil.com` — URL parsing normalizes `\` to `/` for
 * special schemes, which would make it protocol-relative).
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return null;
  }
  return raw;
}
