/**
 * The result shape auth Server Actions return on failure.
 *
 * WHY THIS IS A SEPARATE MODULE, not part of `authActions.ts`:
 * `authActions.ts` is `'use server'`, and every export from such a file must be
 * an async function. A sync type guard there fails the Turbopack build with
 * "Ecmascript file had an error" — and `tsc --noEmit` does NOT catch it, so it
 * only shows up in `yarn build`.
 *
 * WHY FAILURES ARE RETURNED, NOT THROWN: in a production build Next.js replaces
 * the message of anything thrown from a Server Action with
 *
 *   "An error occurred in the Server Components render. The specific message is
 *    omitted in production builds to avoid leaking sensitive details…"
 *
 * The client rendered that verbatim, because the redacted object is still an
 * `Error` and the usual `error instanceof Error ? error.message : fallback`
 * always takes the first branch. A returned value is never redacted, so the
 * real reason survives.
 */

export type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'RATE_LIMITED'
  | 'ACCOUNT_ARCHIVED'
  | 'ACCOUNT_INACTIVE'
  | 'WRONG_PORTAL'
  | 'EMAIL_TAKEN'
  | 'INTERNAL_ERROR';

export interface AuthFailure {
  failed: true;
  code: AuthErrorCode;
  message: string;
}

/**
 * The rate-limited failure. Keeps `rateLimited: true` so the pre-existing
 * `'rateLimited' in result` checks — and the forms' distinct 429 copy — keep
 * working unchanged.
 */
export interface LoginRateLimited extends AuthFailure {
  rateLimited: true;
  code: 'RATE_LIMITED';
}

/**
 * Narrow an action result to its failure branch.
 *
 * Accepts `rateLimited` on its own as well as `failed`: the 429 shape predates
 * `AuthFailure`, and a guard that recognised only the newer field would let an
 * older-shaped value fall through to the success path and read `.user` off a
 * failure.
 */
export function isAuthFailure(result: unknown): result is AuthFailure {
  if (typeof result !== 'object' || result === null) return false;
  return 'failed' in result || 'rateLimited' in result;
}
