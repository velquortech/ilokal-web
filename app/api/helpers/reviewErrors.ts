import { NextResponse } from 'next/server';
import { loggedServerError } from '@/app/api/helpers/response';

/**
 * Maps the review RPCs' stable error codes to HTTP responses.
 *
 * The RPCs (migration 20261013100000) raise with MESSAGE = a machine code
 * (`NO_VISIT`, `TOO_FAR`, …) and HINT = a user-facing line. Known codes become
 * `{ code, message }` with the matching status, so the mobile client can branch
 * on `code` and show `message` as is. Anything else is a real server error and
 * goes through the logged 500 funnel, never forwarding the DB text.
 */
const STATUS: Record<string, number> = {
  UNAUTHENTICATED: 401,
  BUSINESS_NOT_FOUND: 404,
  REVIEW_NOT_FOUND: 404,
  NO_VISIT: 403,
  REVIEWS_DISABLED: 403,
  OWN_REVIEW: 403,
  FORBIDDEN: 403,
  UNDER_REVIEW: 409,
  RATE_LIMITED: 429,
  REVIEWS_PAUSED: 503,
  INVALID_RATING: 400,
  INVALID_REASON: 400,
  INVALID_LOCATION: 400,
  INVALID_ACTION: 400,
  COMMENT_TOO_LONG: 422,
  COMMENT_REJECTED: 422,
  LOW_ACCURACY: 422,
  MOCK_LOCATION: 422,
  TOO_FAR: 422,
  NO_BRANCH_LOCATION: 422,
};

type RpcError = {
  message?: string;
  hint?: string | null;
  details?: string | null;
};

export function reviewErrorResponse(
  context: string,
  error: RpcError,
  userId?: string,
): Response {
  const code = error.message ?? '';
  const status = STATUS[code];
  if (!status) return loggedServerError(context, error, userId);

  const body: Record<string, unknown> = { code, message: error.hint || code };
  if (code === 'TOO_FAR' && error.details) {
    const distance = Number(error.details);
    if (Number.isFinite(distance)) body.distance_m = distance;
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (status === 429) headers['Retry-After'] = '3600';
  return new NextResponse(JSON.stringify(body), { status, headers });
}
