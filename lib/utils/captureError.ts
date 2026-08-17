/**
 * The one place server-side errors are handed to Sentry.
 *
 * Two callers, deliberately shaped the same way:
 *  - `loggedServerError` in `app/api/helpers/response.ts` — the funnel for API
 *    500s (60 call sites).
 *  - `logActionError` below — the funnel for Server Actions, which is the
 *    larger blind spot: an action catches its own error and RETURNS
 *    `{ success: false, error: { code } }` by design, so it never throws and
 *    Next's `onRequestError` never sees it. Nothing here is automatic.
 *
 * See `.claude/SENTRY_MONITORING.md` (SN7, SN8, SN20).
 */

import { formatErrorForLog } from './describeDbError';
import { isExpectedError } from './monitoring';

/**
 * Send an error to Sentry, if and only if Sentry is configured.
 *
 * The SDK is imported DYNAMICALLY and only behind the DSN check. A static
 * import would pull `@sentry/nextjs` into every test that touches an action or
 * an API route, and the suite must stay offline. This makes that guarantee
 * structural rather than something each test file has to remember to mock.
 *
 * Fire-and-forget by contract: monitoring must never delay, reject, or alter
 * the path it is describing.
 */
export function captureServerError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
  /**
   * ST8 / SN15 — the id of the user this failure happened to.
   *
   * **Id only. Never an email, name or IP.** `sendDefaultPii` is false in every
   * runtime config and this must not become the hole in that. An id is enough
   * to answer "did this break for the owner who reported it", which is the
   * whole point; anything more is a privacy surface with no extra diagnostic
   * value.
   *
   * Passed explicitly rather than read from ambient session state. SN15 was
   * deferred because attributing one user's id to another user's event is a
   * WORSE defect than a missing field, and an ambient read is exactly how that
   * happens under concurrency. See `withScope` below.
   */
  userId?: string,
): void {
  if (!process.env.SENTRY_DSN) return;
  if (error === null || error === undefined) return;

  // `redirect()` and `notFound()` throw by design, and several actions catch
  // broadly enough to swallow them. Capturing those would report normal
  // navigation as a fault — and there are far more of them than real errors.
  if (isExpectedError(error)) return;

  void import('@sentry/nextjs')
    .then((Sentry) => {
      const options = {
        // The stack decides grouping; the tag is what lets you filter to one
        // action or one API context without reading driver text.
        tags: { context },
        level: 'error' as const,
        ...fingerprintFor(context, error),
        ...(extra ? { extra } : {}),
      };

      if (!userId) {
        Sentry.captureException(error, options);
        return;
      }

      // `withScope` — NOT `Sentry.setUser()`. A bare `setUser` on a Node server
      // writes to a scope that outlives this call, so a later event from a
      // DIFFERENT request can inherit this user's id. That cross-request bleed
      // is precisely the risk SN15 refused to ship on. A scope created here,
      // used once, and discarded cannot bleed no matter how requests interleave
      // — the isolation is structural rather than a property of async context
      // propagation that we would have to keep re-verifying.
      Sentry.withScope((scope) => {
        scope.setUser({ id: userId });
        Sentry.captureException(error, options);
      });
    })
    .catch(() => {
      /* monitoring must never break the request path */
    });
}

/**
 * Grouping override for values that carry no stack (ST7).
 *
 * PostgREST errors are PLAIN OBJECTS — `{ code, message, details, hint }`, no
 * `stack`. Sentry synthesises a stack for those at the capture site, and the
 * capture site is the `.then()` above: identical for every caller. The result
 * observed in production was an issue titled `<anonymous>` whose most relevant
 * frame was this file, which is where ALL 100+ call sites would eventually
 * collapse to — one issue, no grouping, no useful alerting.
 *
 * Moving the `captureException` call is not an option: the dynamic import is
 * what keeps `@sentry/nextjs` out of the offline test suite. So the fix is to
 * hand Sentry a fingerprint instead.
 *
 * Deliberately narrow. A real `Error` has a real stack pointing at real code,
 * and that is a better grouping key than anything derivable here — so those are
 * left on `{{ default }}` and this returns nothing at all.
 */
function fingerprintFor(
  context: string,
  error: unknown,
): { fingerprint: string[] } | Record<string, never> {
  if (error instanceof Error && typeof error.stack === 'string') return {};

  // `code` is the PostgREST/Postgres SQLSTATE (`23503`, `42P01`) or an app
  // error code. It is deliberately preserved by the redaction rules in
  // `monitoring.ts` — blanket-redacting it would strip the single most useful
  // field from every event — so it is safe and useful to group on.
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : 'unknown';

  // `{{ default }}` is deliberately NOT included here. For a stackless capture
  // Sentry's default components derive from the object's KEY SET (the
  // "Non-Error exception captured with keys: …" value), so keeping it would let
  // `{code, message}` and `{code, message, details, hint}` from the same
  // context and SQLSTATE split into two issues — the exact collapse-vs-split
  // problem this function exists to fix, one level down. The context and the
  // code are the whole signal here.
  return { fingerprint: [context, code] };
}

/**
 * Log a Server Action failure and report it.
 *
 * The console output stays byte-identical to the
 * `console.error('[actionName]', error)` call this replaced across the action
 * layer — the log line is what people actually grep in a hosting provider's
 * log stream — EXCEPT for DB-shaped errors. `PostgrestError` carries its
 * fields non-enumerably, so logging it raw renders `{}` (an error report that
 * names no error); those are flattened with `describeDbError` instead. Real
 * `Error` instances keep their stack and redirect/notFound digests keep
 * theirs, so only the genuinely unreadable case changes shape.
 *
 * The flattening is console-only: `captureServerError` always receives the
 * ORIGINAL error, which Sentry's fingerprinting (`code`/SQLSTATE grouping)
 * and redaction rules are written against.
 */
export function logActionError(
  action: string,
  error: unknown,
  userId?: string,
): void {
  console.error(`[${action}]`, formatErrorForLog(error));
  captureServerError(action, error, undefined, userId);
}
