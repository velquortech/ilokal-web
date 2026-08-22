import { NextResponse } from 'next/server';
import { captureServerError } from '@/lib/utils/captureError';
import { describeDbError, isDbErrorShape } from '@/lib/utils/describeDbError';

export function generalErrorResponse<T>(data?: T): Response {
  return new NextResponse(
    JSON.stringify(data || { message: 'General Error' }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

// Log the real (backend/Supabase) error server-side, return a generic 500 to the
// client. Never forward `error.message` to mobile clients — it leaks table/column
// names, constraint names, RLS hints, and SQL, and is meaningless to end users.
//
// This is also the single funnel for API 500s — 60 call sites across `app/api`
// — which is why the Sentry capture lives here rather than being sprinkled
// through the routes (`.claude/SENTRY_MONITORING.md`, SN8).
// `error` is `unknown`, not `{ message?: string }`. A `catch (error)` binding is
// typed `unknown`, so the narrower signature forced every catch-block caller to
// cast — and Next 16's build does not type-check, so a wrong cast here would
// ship silently. Widening keeps the 60 existing call sites working (they pass
// PostgrestError objects) and lets any catch reach the funnel directly.
export function loggedServerError(
  context: string,
  error?: unknown,
  // ST8: the id of the user this 500 happened to, where the handler already has
  // one (`getMobileUser` / `assertAuthorized`). Id only — never email or name.
  // Optional because most public routes genuinely have no user.
  userId?: string,
): Response {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? (error as { message?: unknown }).message
      : undefined;

  // PostgrestError carries its fields non-enumerably, so logging the object
  // raw would render `{}`; flatten DB-shaped errors (non-Error objects
  // carrying code/message) with describeDbError — the SAME shape logActionError
  // produces for Server Actions, so the two funnels read alike and the line
  // surfaces code, message, details and hint. Everything else keeps the legacy
  // `[context] message` shape people grep for: only a real string message is
  // logged, and an error without one logs nothing (unchanged behaviour).
  const dbError = isDbErrorShape(error) ? describeDbError(error) : undefined;
  if (dbError) {
    console.error(`[${context}]`, dbError);
  } else if (typeof message === 'string' && message) {
    console.error(`[${context}]`, message);
  }

  captureServerError(context, error, undefined, userId);
  return generalErrorResponse();
}

/**
 * Did PostgREST refuse a `.range()` that starts past the end of the result set?
 *
 * `PGRST103` — "Requested range not satisfiable", details like *"An offset of
 * 10 was requested, but there are only 1 rows"*. This is not a fault: it is a
 * client asking for page 2 of a one-page result, which happens routinely when
 * rows are removed between two requests, or when a filter narrows the set while
 * the app is still paging.
 *
 * Unhandled it was **197 events on one issue** (JAVASCRIPT-NEXTJS-9) and a 500
 * on `/api/mobile/businesses/nearby`, which has since moved its paging into the
 * RPC. The same shape remains anywhere a `.range()` sits on top of a
 * caller-supplied page number, so callers map it to an EMPTY page instead.
 */
export function isRangeNotSatisfiable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'PGRST103'
  );
}

export function conflictRequestResponse<T>(data?: T): NextResponse {
  return new NextResponse(
    JSON.stringify(data || { message: 'entry conflict' }),
    {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export function successResponse<T>(data?: T): NextResponse {
  return new NextResponse(JSON.stringify(data || { message: 'Successfuly' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function notFoundResponse<T>(data?: T): NextResponse {
  return new NextResponse(JSON.stringify(data || { message: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function badRequestResponse<T>(data?: T): NextResponse {
  return new NextResponse(JSON.stringify(data || { message: 'Bad request' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function unauthorizedResponse<T>(data?: T): NextResponse {
  return new NextResponse(JSON.stringify(data || { message: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function forbiddenResponse<T>(data?: T): NextResponse {
  return new NextResponse(JSON.stringify(data || { message: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function validationErrorNextResponse<T>(data?: T): NextResponse {
  return new NextResponse(
    JSON.stringify(data || { message: 'Validation Error' }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export function tooManyRequestsResponse(retryAfterSec: number): NextResponse {
  return new NextResponse(
    JSON.stringify({ message: 'Too many requests, please slow down' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, retryAfterSec)),
      },
    },
  );
}
