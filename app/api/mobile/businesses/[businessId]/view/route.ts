import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { isValidResourceId } from '@/app/api/helpers/resourceId';
import { businessIdSchema } from '@/lib/validation/business';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

/**
 * Is this FK violation the one caused by the business id the caller sent?
 *
 * `view_events` has THREE foreign keys — `business_id → businesses`,
 * `user_id → profiles` and `product_id → products`
 * (`20260611000001_view_events.sql:20-22`) — so matching 23503 on the SQLSTATE
 * alone would answer a *different* fault with a 404 saying the shop does not
 * exist, and report nothing.
 *
 * That second class is reachable, not theoretical: the admin hard-delete
 * removes the `profiles` row and deliberately leaves the auth user
 * (`app/api/admin/profiles/[id]/delete/route.ts`), so an orphaned-but-valid JWT
 * hits `view_events_user_id_fkey`. That is a real fault and must reach Sentry.
 */
function isMissingBusinessViolation(error: {
  code?: string;
  message?: string;
  details?: string | null;
}): boolean {
  if (error.code !== '23503') return false;
  return /business_id|view_events_business_id_fkey/.test(
    `${error.message ?? ''} ${error.details ?? ''}`,
  );
}

// Record a business profile open (migration 20260611000001). Deduped
// server-side to one view per user per day; the client fire-and-forgets.
// Public path, but a verified Bearer token is required — anonymous "views"
// can't be deduped and would be trivial to inflate.
export async function POST(req: NextRequest, { params }: Params) {
  // ST8: hoisted so the catch below can attribute a failure to the caller. The
  // JWT is verified inside `getMobileUser`, so this id is trustworthy.
  let userId: string | undefined;

  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();
    userId = auth.user.id;

    const { businessId } = await params;
    // A slug (`bida-ngayon`) reaching PostgREST as a `uuid` is a 22P02 and a
    // 500 for what is really "no such shop". See app/api/helpers/resourceId.ts.
    if (!isValidResourceId(businessId)) {
      return notFoundResponse({ message: 'Business not found' });
    }

    // A malformed id raises 22P02 inside the RPC, which would now be a REPORTED
    // 500 on every such request — against a 200/60s/IP limit and a monthly event
    // quota. Reject it in the shape check instead, where it costs nothing.
    if (!businessIdSchema.safeParse(businessId).success) {
      return notFoundResponse();
    }

    const { error } = await auth.supabase.rpc('record_view', {
      p_business_id: businessId,
    });

    if (error) {
      // The caller sent a business id that is not in `businesses`. Seen in
      // production from the Android client holding a stale cached id
      // (JAVASCRIPT-NEXTJS-5). A view ping is fire-and-forget telemetry: it
      // must not 500, it must not be retried, and it must not fill the error
      // stream with something no server-side change can fix. 404 is the honest
      // answer — the shop being viewed does not exist.
      //
      // Narrowed to the business FK specifically: see `isMissingBusinessViolation`.
      // Every other 23503 is a real fault and falls through to be reported.
      if (isMissingBusinessViolation(error)) return notFoundResponse();

      return loggedServerError(
        'mobile/businesses/[businessId]/view',
        error,
        userId,
      );
    }

    return successResponse({ message: 'View recorded' });
  } catch (error) {
    // Was a bare `catch {}` that destroyed the cause (ST3 class). The response
    // body is unchanged — `loggedServerError` returns the same generic shape —
    // so this only changes what the server records, not what the client sees.
    return loggedServerError(
      'mobile/businesses/[businessId]/view',
      error,
      userId,
    );
  }
}
