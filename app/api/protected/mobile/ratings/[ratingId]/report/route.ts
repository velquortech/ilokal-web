import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { reviewErrorResponse } from '@/app/api/helpers/reviewErrors';
import { isValidResourceId } from '@/app/api/helpers/resourceId';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ ratingId: string }> };

const REASONS = new Set([
  'fake',
  'offensive',
  'spam',
  'personal_info',
  'other',
]);

/**
 * POST /api/protected/mobile/ratings/:ratingId/report `{ reason, note? }` → 204.
 *
 * Idempotent per reporter. Three distinct reporters move the review into
 * moderation (hidden until an admin restores or removes it) — the RPC does it
 * atomically, so the caller never needs to know which report tipped it.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();
    const { ratingId } = await params;
    if (!isValidResourceId(ratingId)) {
      return notFoundResponse({
        code: 'REVIEW_NOT_FOUND',
        message: 'This review is no longer available',
      });
    }
    const body = (await req.json().catch(() => null)) as {
      reason?: unknown;
      note?: unknown;
    } | null;
    if (typeof body?.reason !== 'string' || !REASONS.has(body.reason)) {
      return badRequestResponse({
        code: 'INVALID_REASON',
        message: 'Pick a reason',
      });
    }
    if (
      body.note != null &&
      (typeof body.note !== 'string' || body.note.length > 300)
    ) {
      return badRequestResponse({
        code: 'INVALID_NOTE',
        message: 'Keep the note under 300 characters',
      });
    }

    const { error } = await auth.supabase.rpc('report_business_rating', {
      p_rating: ratingId,
      p_reason: body.reason,
      p_note: (body.note as string | undefined) ?? null,
    });
    if (error) {
      return reviewErrorResponse(
        'protected/mobile/ratings/[ratingId]/report',
        error,
        auth.user.id,
      );
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return generalErrorResponse();
  }
}
