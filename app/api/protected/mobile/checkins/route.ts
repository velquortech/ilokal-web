import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { reviewErrorResponse } from '@/app/api/helpers/reviewErrors';
import { isValidResourceId } from '@/app/api/helpers/resourceId';
import { NextRequest } from 'next/server';

const CONTEXT = 'protected/mobile/checkins';

/**
 * POST /api/protected/mobile/checkins
 *   `{ business_id, lat, lng, accuracy_m, mocked }`
 *   → `{ checkin: { checked_in_on, distance_m }, eligibility }`
 *
 * A check-in is the open-beta proof of visit for reviews. The server decides
 * "close enough" from the nearest branch's stored location (≤150 m, accuracy
 * ≤100 m, mock locations refused); the client only reports its fix. Raw
 * coordinates are not stored. On success the fresh eligibility is returned so
 * the app can open the review sheet without a second round-trip.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const businessId = body?.business_id;
    if (typeof businessId !== 'string' || !isValidResourceId(businessId)) {
      return notFoundResponse({
        code: 'BUSINESS_NOT_FOUND',
        message: 'Business not found',
      });
    }
    const { lat, lng, accuracy_m: accuracy, mocked } = body ?? {};
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      typeof accuracy !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(accuracy)
    ) {
      return badRequestResponse({
        code: 'INVALID_LOCATION',
        message: "We couldn't read your location",
      });
    }

    const { data: checkin, error } = await auth.supabase.rpc(
      'record_business_checkin',
      {
        p_business: businessId,
        p_lat: lat,
        p_lng: lng,
        p_accuracy_m: accuracy,
        p_mocked: mocked === true,
      },
    );
    if (error) return reviewErrorResponse(CONTEXT, error, auth.user.id);

    const { data: state, error: stateError } = await auth.supabase.rpc(
      'get_my_business_review',
      { p_business: businessId },
    );
    if (stateError)
      return reviewErrorResponse(CONTEXT, stateError, auth.user.id);

    return successResponse({
      checkin,
      eligibility: (state as { eligibility: unknown }).eligibility,
    });
  } catch {
    return generalErrorResponse();
  }
}
