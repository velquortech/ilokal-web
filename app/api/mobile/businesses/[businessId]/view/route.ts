import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

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

    const { error } = await auth.supabase.rpc('record_view', {
      p_business_id: businessId,
    });

    if (error) {
      // 23503 foreign_key_violation on `view_events_business_id_fkey` — the
      // caller sent a business id that is not in `businesses`. Seen in
      // production from the Android client holding a stale cached id
      // (JAVASCRIPT-NEXTJS-5). A view ping is fire-and-forget telemetry: it
      // must not 500, it must not be retried, and it must not fill the error
      // stream with something no server-side change can fix. 404 is the honest
      // answer — the shop being viewed does not exist.
      if (error.code === '23503') return notFoundResponse();

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
