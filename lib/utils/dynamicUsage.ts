/**
 * Next's "this route cannot be static" bailout.
 *
 * `cookies()` and `headers()` signal that a route must be rendered per-request
 * by THROWING. Any `catch` around a Supabase call that reads cookies will see
 * that throw — and a catch-all that answers with a fallback turns "make this
 * route dynamic" into a wrong answer baked into the build output: the flag
 * reads `false`, the session reads anonymous, permanently.
 *
 * So every such catch must rethrow this one error and handle the rest.
 *
 * Matched on the stable `digest` rather than the error class, because the
 * class lives under `next/dist/**` — an internal path, not public API, and one
 * that has moved between majors.
 */
export function isDynamicUsageError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  if (typeof digest !== 'string') return false;

  // DYNAMIC_SERVER_USAGE is the bailout itself; the NEXT_ prefix also covers
  // `NEXT_REDIRECT` and `NEXT_NOT_FOUND`, which are control flow rather than
  // failures and must never be swallowed either.
  return digest === 'DYNAMIC_SERVER_USAGE' || digest.startsWith('NEXT_');
}
