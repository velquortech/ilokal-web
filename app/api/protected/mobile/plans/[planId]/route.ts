import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { updatePlanSchema } from '@/lib/validation/plans';
import { loadPlanDetail } from '../detail';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ planId: string }> };

// GET /api/protected/mobile/plans/:planId — the full plan with its ordered
// stops, each joined to its business plus public operating_hours, in one round
// trip. A plan belonging to another user returns 404, not 403 — we never
// confirm a row exists for a non-owner.
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { planId } = await params;
    const plan = await loadPlanDetail(auth.supabase, planId, auth.user.id);

    if (!plan) return notFoundResponse({ message: 'Plan not found' });
    return successResponse({ plan });
  } catch {
    return generalErrorResponse();
  }
}

// PUT /api/protected/mobile/plans/:planId — replace title, date, and the whole
// ordered stop list. The `stops` array order IS the stored `position`.
//
// The write goes through the `replace_plan_stops` function (migration
// 20260828010000) rather than an UPDATE + DELETE + INSERT sequence, because
// Postgres runs a function body inside one transaction. Done as three separate
// PostgREST calls, a failure after the delete left the plan with zero stops and
// returned a 500 — losing the outing the user was only reordering.
//
// The function is SECURITY INVOKER, so `plans` / `plan_stops` RLS still
// restricts every row it touches to the caller. Ownership is additionally
// filtered on `user_id` inside the function; a plan that is missing or owned by
// someone else raises no_data_found, which maps to 404 (never 403 — we do not
// confirm another user's row exists). A business_id that does not exist trips
// the foreign key (23503) and maps to 400, with the transaction rolled back.
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { planId } = await params;

    const parsed = updatePlanSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) {
      return badRequestResponse({ message: 'Invalid plan payload' });
    }
    const { title, target_date, stops } = parsed.data;

    const { error: rpcError } = await auth.supabase.rpc('replace_plan_stops', {
      p_plan_id: planId,
      p_title: title,
      p_target_date: target_date,
      p_stops: stops.map((s) => ({
        business_id: s.business_id,
        stop_time: s.stop_time,
      })),
    });

    if (rpcError) {
      // P0002 = no_data_found, raised when the plan is not the caller's.
      if (rpcError.code === 'P0002') {
        return notFoundResponse({ message: 'Plan not found' });
      }
      // 23503 = foreign_key_violation on plan_stops.business_id.
      if (rpcError.code === '23503') {
        return badRequestResponse({
          message: 'One or more stops reference a business that does not exist',
        });
      }
      return loggedServerError(
        'protected/mobile/plans/[planId]',
        rpcError,
        auth.user.id,
      );
    }

    const plan = await loadPlanDetail(auth.supabase, planId, auth.user.id);
    if (!plan) return notFoundResponse({ message: 'Plan not found' });
    return successResponse({ plan });
  } catch {
    return generalErrorResponse();
  }
}

// DELETE /api/protected/mobile/plans/:planId — delete the plan; its stops are
// removed by the FK cascade. 204.
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { planId } = await params;

    const { error } = await auth.supabase
      .from('plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', auth.user.id);

    if (error)
      return loggedServerError(
        'protected/mobile/plans/[planId]',
        error,
        auth.user.id,
      );

    // RLS scopes the delete to the owner, so a missing row is indistinguishable
    // from a successful delete of an already-gone plan — return success either
    // way. We never report 404 here to avoid confirming another user's row.
    return new NextResponse(null, { status: 204 });
  } catch {
    return generalErrorResponse();
  }
}
