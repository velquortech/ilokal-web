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
): void {
  if (!process.env.SENTRY_DSN) return;
  if (error === null || error === undefined) return;

  // `redirect()` and `notFound()` throw by design, and several actions catch
  // broadly enough to swallow them. Capturing those would report normal
  // navigation as a fault — and there are far more of them than real errors.
  if (isExpectedError(error)) return;

  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error, {
        // The stack decides grouping; the tag is what lets you filter to one
        // action or one API context without reading driver text.
        tags: { context },
        level: 'error',
        ...(extra ? { extra } : {}),
      });
    })
    .catch(() => {
      /* monitoring must never break the request path */
    });
}

/**
 * Log a Server Action failure and report it.
 *
 * The console output is deliberately byte-identical to the
 * `console.error('[actionName]', error)` call this replaced across the action
 * layer — the log line is what people actually grep in a hosting provider's
 * log stream, and changing its shape to add monitoring would have been a
 * trade nobody asked for.
 */
export function logActionError(action: string, error: unknown): void {
  console.error(`[${action}]`, error);
  captureServerError(action, error);
}
