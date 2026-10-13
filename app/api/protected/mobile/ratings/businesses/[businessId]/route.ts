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
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

const CONTEXT = 'protected/mobile/ratings/businesses/[businessId]';

/**
 * The signed-in user's review of one business.
 *
 * Every write goes through a SECURITY DEFINER RPC (migration 20261013100000):
 * the table no longer grants INSERT/UPDATE/DELETE to `authenticated`, so the
 * eligibility rule (visit evidence), comment filters, rate limit, the owner's
 * `allow_reviews` and the global kill switch can't be bypassed by calling
 * PostgREST directly.
 */

/** GET → `{ mine, eligibility }`, which drives the app's review button. */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();
    const { businessId } = await params;
    if (!isValidResourceId(businessId)) {
      return notFoundResponse({ message: 'Business not found' });
    }
    const { data, error } = await auth.supabase.rpc('get_my_business_review', {
      p_business: businessId,
    });
    if (error) return reviewErrorResponse(CONTEXT, error, auth.user.id);
    return successResponse(data);
  } catch {
    return generalErrorResponse();
  }
}

/** POST `{ rating, comment? }` → `{ rating: MyReview }` (create or edit). */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();
    const { businessId } = await params;
    if (!isValidResourceId(businessId)) {
      return notFoundResponse({ message: 'Business not found' });
    }

    const body = (await req.json().catch(() => null)) as {
      rating?: unknown;
      comment?: unknown;
    } | null;
    const rating = body?.rating;
    const comment = body?.comment;
    if (
      !Number.isInteger(rating) ||
      (rating as number) < 1 ||
      (rating as number) > 5
    ) {
      return badRequestResponse({
        code: 'INVALID_RATING',
        message: 'Pick 1 to 5 stars',
      });
    }
    if (comment != null && typeof comment !== 'string') {
      return badRequestResponse({
        code: 'INVALID_COMMENT',
        message: 'Comment must be text',
      });
    }

    const { data, error } = await auth.supabase.rpc('upsert_business_rating', {
      p_business: businessId,
      p_rating: rating as number,
      p_comment: (comment as string | null | undefined) ?? null,
    });
    if (error) return reviewErrorResponse(CONTEXT, error, auth.user.id);
    return successResponse({ rating: data });
  } catch {
    return generalErrorResponse();
  }
}

/** DELETE → 204. Removes my review (published or awaiting moderation). */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();
    const { businessId } = await params;
    if (!isValidResourceId(businessId)) {
      return notFoundResponse({ message: 'Business not found' });
    }
    const { data, error } = await auth.supabase.rpc(
      'delete_my_business_rating',
      {
        p_business: businessId,
      },
    );
    if (error) return reviewErrorResponse(CONTEXT, error, auth.user.id);
    if (!data)
      return notFoundResponse({
        code: 'REVIEW_NOT_FOUND',
        message: 'No review to delete',
      });
    return new NextResponse(null, { status: 204 });
  } catch {
    return generalErrorResponse();
  }
}
