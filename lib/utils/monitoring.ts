/**
 * Pure helpers for error monitoring.
 *
 * Deliberately imports nothing from `@sentry/nextjs`. Two reasons:
 *
 * 1. These are the rules that decide what leaves this server and reaches a
 *    third party, so they are the part that must be unit-testable. A helper
 *    that can only be exercised through an SDK's `beforeSend` is a helper
 *    nobody tests.
 * 2. `sentry.server.config.ts` is loaded by `instrumentation.ts` at server
 *    boot and never by vitest. Keeping the logic here means the test suite
 *    covers it without loading the SDK or needing a DSN.
 *
 * See `.claude/SENTRY_MONITORING.md` (SN6, SN14).
 */

import { isRedirectError } from './redirectError';

export const REDACTED = '[redacted]';

/**
 * Key SEGMENTS whose value must never be sent, whatever it contains.
 *
 * Matching is per-segment, not on a prefix or a suffix, because the dangerous
 * word lands in every position in practice: `token_hash` (first),
 * `contact_email` (last), `phone_number` (first, with a harmless tail). A
 * suffix rule reads correctly and silently misses `token_hash` and
 * `phone_number` — which is exactly what the first version of this file did,
 * and what its tests caught.
 *
 * Coordinates are in the list on purpose, even though a BRANCH's coordinates
 * are public (they are on the explore map). The lat/lng most likely to appear
 * in an event payload comes from `/explore/nearby` and `/events/nearby`, which
 * carry the VISITOR's own position — the one coordinate pair here that is
 * genuinely private.
 */
const SENSITIVE_SEGMENTS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'key',
  'authorization',
  'auth',
  'cookie',
  'session',
  'jwt',
  'otp',
  'email',
  'phone',
  'address',
  'lat',
  'lng',
  'latitude',
  'longitude',
]);

/**
 * Split a key into comparable segments, covering both spellings this codebase
 * uses: `snake_case`/`kebab-case` from Postgres and headers, `camelCase` from
 * TypeScript. Equality per segment, never substring — otherwise `keyboard`
 * would match `key` and `translate` would match `lat`.
 */
function keySegments(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.toLowerCase());
}

/**
 * The cashier code alphabet from `gen_redemption_code` (migration
 * `20260608000002`): `23456789ABCDEFGHJKMNPQRSTUVWXYZ` — 6 characters, 7 in
 * the collision-escape case. Note what it EXCLUDES: `0`, `1`, `I`, `L`, `O`.
 *
 * Shape alone is not enough to redact on (`STATUS` and `RESULT` are built from
 * the same letters), and the key alone is not enough either — `code` is also
 * the key `describeDbError` puts a Postgres SQLSTATE under, and the whole
 * `ApiResponse` error envelope uses `code` for `VALIDATION_ERROR`,
 * `NOT_FOUND`, `RATE_LIMITED`. Redacting those blindly would strip the single
 * most useful field out of every event and leave the tool reporting that
 * something failed without saying what.
 *
 * Requiring BOTH is exact here, and safely so: a SQLSTATE is 5 characters
 * (`42P01`) so it cannot match on length, and its digits `0`/`1` are outside
 * the alphabet anyway; the app's own codes are longer and contain `_`.
 */
const REDEMPTION_CODE = /^[2-9A-HJKMNP-Z]{6,7}$/;

export function isRedemptionCode(value: unknown): boolean {
  return typeof value === 'string' && REDEMPTION_CODE.test(value);
}

/** Guard against a cyclic or pathologically deep payload. */
const MAX_DEPTH = 6;

export function isSensitiveKey(key: string): boolean {
  return keySegments(key).some((segment) => SENSITIVE_SEGMENTS.has(segment));
}

/** True for `code`, `redemption_code`, `claimCode` — any key naming a code. */
function isCodeKey(key: string): boolean {
  return keySegments(key).includes('code');
}

/**
 * An email address embedded in a VALUE rather than named by a key.
 *
 * Key-based redaction misses these entirely, and Postgres puts them in error
 * text verbatim: `Key (email)=(a@b.com) already exists.` The key there is
 * `details`, which is not sensitive and must stay — it is how you tell which
 * constraint fired — so the address has to be removed from inside the string.
 *
 * Only email. A phone pattern over free text would also match ids, SQLSTATEs
 * and row counts, and silently strip the fields that make an event useful; the
 * false-positive cost is worse than the leak it would close.
 */
const EMAIL_IN_TEXT = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

export function redactEmails(value: string): string {
  return value.replace(EMAIL_IN_TEXT, REDACTED);
}

/**
 * Decide the replacement for one key/value pair.
 * Exported because it is the whole redaction policy in one place.
 */
export function scrubEntry(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) return REDACTED;
  if (isCodeKey(key) && isRedemptionCode(value)) return REDACTED;
  // `sendDefaultPii` is false, but that only governs what the SDK attaches on
  // its own — it does nothing about an address sitting inside driver text we
  // hand it ourselves.
  if (typeof value === 'string' && value.includes('@')) {
    const redacted = redactEmails(value);
    if (redacted !== value) return redacted;
  }
  return undefined; // "no opinion" — caller keeps recursing
}

/**
 * Next.js throws control-flow "errors" for `redirect()` and `notFound()`, and
 * an aborted request rejects. None of these is a fault, and unfiltered they are
 * the majority of events — every `redirect()` in the app throws one, and the
 * proxy alone redirects on every unauthenticated navigation.
 *
 * `redirect()` is covered by the existing `isRedirectError` rather than a
 * second copy of that digest check.
 */
export function isExpectedError(error: unknown): boolean {
  if (isRedirectError(error)) return true;
  if (typeof error !== 'object' || error === null) return false;

  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest === 'string') {
    // `notFound()`. Next has spelled this two ways across 15/16, so both.
    if (digest.startsWith('NEXT_NOT_FOUND')) return true;
    if (digest.startsWith('NEXT_HTTP_ERROR_FALLBACK')) return true;
  }

  const name = (error as { name?: unknown }).name;
  if (name === 'AbortError') return true;

  return false;
}

/**
 * Strip sensitive query parameters, keeping the path so the event is still
 * attributable to a route.
 *
 * An unparseable input is replaced wholesale rather than half-rewritten: a URL
 * we failed to understand is not one we should guess at and then send.
 */
export function scrubUrl(url: string): string {
  const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(url);
  let parsed: URL;
  try {
    parsed = new URL(url, 'https://placeholder.invalid');
  } catch {
    return REDACTED;
  }

  // Note the asymmetry with `scrubEntry`: in a URL a `code` param is redacted
  // unconditionally, without the shape check. `/api/auth/callback?code=…` is
  // the PKCE authorization code — genuinely secret, and nothing like a cashier
  // code in shape. There is no error code in a query string worth keeping, so
  // the compromise that protects `42P01` inside an object has no reason to
  // apply here.
  let changed = false;
  for (const key of [...parsed.searchParams.keys()]) {
    if (!isSensitiveKey(key) && !isCodeKey(key)) continue;
    parsed.searchParams.set(key, REDACTED);
    changed = true;
  }
  if (!changed) return url;

  // Give back the shape we were handed, so a relative path does not come back
  // rooted at the placeholder origin.
  return isAbsolute
    ? parsed.toString()
    : `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/**
 * Deep key-based redaction. Arrays keep their length — an index is not a key,
 * and dropping elements would misrepresent the payload to whoever reads it.
 */
export function scrubObject<T>(value: T, depth = 0): T {
  if (depth > MAX_DEPTH) return REDACTED as unknown as T;
  if (Array.isArray(value)) {
    return value.map((item) => scrubObject(item, depth + 1)) as unknown as T;
  }
  if (typeof value !== 'object' || value === null) return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const decided = scrubEntry(key, item);
    out[key] = decided !== undefined ? decided : scrubObject(item, depth + 1);
  }
  return out as unknown as T;
}

/** Headers are flat and small, and the dangerous ones are known by name. */
export function scrubHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = isSensitiveKey(key) ? REDACTED : value;
  }
  return out;
}
