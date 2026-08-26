import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  loggedServerError,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { updatePlanSchema } from '@/lib/validation/plans';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ planId: string }> };

// The enriched stop shape returned to the client — each stop carries its
// business's public info so the mobile app can render and evaluate
// availability in one round trip, with no per-stop fetch.
const STOP_SELECT = `
  id, stop_time, position,
  businesses(id, shop_name, logo_url, business_settings(operating_hours))
`;

type StopRow = {
  id: string;
  stop_time: string | null;
  position: number;
  businesses: {
    id: string;
    shop_name: string;
    logo_url: string | null;
    business_settings: { operating_hours: unknown } | null;
  } | null;
};

/** Flatten the Supabase join into the mobile PlanStop.business shape. */
function flattenStop(row: StopRow) {
  const biz = row.businesses;
  return {
    id: row.id,
    stop_time: row.stop_time,
    position: row.position,
    business: biz
      ? {
          id: biz.id,
          shop_name: biz.shop_name,
          logo_url: biz.logo_url,
          operating_hours: biz.business_settings?.operating_hours ?? null,
        }
      : null,
  };
}

// GET /api/protected/mobile/plans/:planId
//
// Full plan with ordered stops, each enriched with its business's public info
// (name, logo, operating_hours). The availability flag is evaluated
// client-side — the backend stays a data joiner.
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { planId } = await params;

    // Fetch the plan. RLS enforces ownership; the explicit user_id filter
    // is defense-in-depth and ensures a planId belonging to another user
    // returns 404 (not 403) so we never confirm the row exists.
    const { data: plan, error: planError } = await auth.supabase
      .from('plans')
      .select('id, title, target_date')
      .eq('id', planId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (planError)
      return loggedServerError(
        'protected/mobile/plans/[planId]',
        planError,
        auth.user.id,
      );
    if (!plan) return notFoundResponse({ message: 'Plan not found' });

    // Fetch stops with business info in a single join. Ordered by position
    // so the array order matches the stored sequence.
    const { data: stopRows, error: stopsError } = await auth.supabase
      .from('plan_stops')
      .select(STOP_SELECT)
      .eq('plan_id', planId)
      .order('position', { ascending: true });

    if (stopsError)
      return loggedServerError(
        'protected/mobile/plans/[planId]',
        stopsError,
        auth.user.id,
      );

    // Filter out any stop whose business join returned null — the FK cascade
    // should prevent this, but a race or RLS edge case could leave an orphan.
    // The mobile PlanStop type declares business non-nullable, so returning
    // one would crash the client on access.
    const stops =
      (stopRows as StopRow[] | null)
        ?.map(flattenStop)
        .filter((s) => s.business !== null) ?? [];

    return successResponse({ plan: { ...plan, stops } });
  } catch {
    return generalErrorResponse();
  }
}

// PUT /api/protected/mobile/plans/:planId
//
// Replace the plan's title, date, and entire stop list atomically.
// The stops array order IS the stored position (0..n-1).
//
// Transaction semantics via sequential writes:
// 1. Validate every business_id exists before writing — reject the whole
//    request on any invalid id rather than writing a partial plan.
// 2. Delete all existing stops for the plan.
// 3. Insert the new stops with computed positions.
// 4. Update the plan's title and date.
//
// Last-write-wins is correct for private single-user data.
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { planId } = await params;

    const parsed = updatePlanSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) {
      return badRequestResponse({
        message: 'title, target_date (YYYY-MM-DD), and stops are required',
      });
    }

    const { title, target_date, stops } = parsed.data;

    // Verify the plan exists and belongs to this user.
    const { data: existing, error: existError } = await auth.supabase
      .from('plans')
      .select('id')
      .eq('id', planId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (existError)
      return loggedServerError(
        'protected/mobile/plans/[planId]',
        existError,
        auth.user.id,
      );
    if (!existing) return notFoundResponse({ message: 'Plan not found' });

    // Validate all business_ids exist before writing anything.
    if (stops.length > 0) {
      const businessIds = [...new Set(stops.map((s) => s.business_id))];
      const { data: validBiz, error: bizError } = await auth.supabase
        .from('businesses')
        .select('id')
        .in('id', businessIds);

      if (bizError)
        return loggedServerError(
          'protected/mobile/plans/[planId]',
          bizError,
          auth.user.id,
        );

      const validSet = new Set((validBiz ?? []).map((b) => b.id));
      const missing = businessIds.filter((id) => !validSet.has(id));
      if (missing.length > 0) {
        return badRequestResponse({
          message: `Invalid business_id(s): ${missing.join(', ')}`,
        });
      }
    }

    // Delete all existing stops for this plan.
    const { error: deleteError } = await auth.supabase
      .from('plan_stops')
      .delete()
      .eq('plan_id', planId);

    if (deleteError)
      return loggedServerError(
        'protected/mobile/plans/[planId]',
        deleteError,
        auth.user.id,
      );

    // Insert the new stops with computed positions.
    if (stops.length > 0) {
      const stopRows = stops.map((s, i) => ({
        plan_id: planId,
        business_id: s.business_id,
        stop_time: s.stop_time,
        position: i,
      }));

      const { error: insertError } = await auth.supabase
        .from('plan_stops')
        .insert(stopRows);

      if (insertError)
        return loggedServerError(
          'protected/mobile/plans/[planId]',
          insertError,
          auth.user.id,
        );
    }

    // Update the plan's title and date.
    const { error: updateError } = await auth.supabase
      .from('plans')
      .update({ title, target_date, updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (updateError)
      return loggedServerError(
        'protected/mobile/plans/[planId]',
        updateError,
        auth.user.id,
      );

    // Return the plan in its GET-detail shape so the client can update
    // its local state without a separate refetch.
    const { data: savedStops, error: refetchError } = await auth.supabase
      .from('plan_stops')
      .select(STOP_SELECT)
      .eq('plan_id', planId)
      .order('position', { ascending: true });

    if (refetchError)
      return loggedServerError(
        'protected/mobile/plans/[planId]',
        refetchError,
        auth.user.id,
      );

    const flattenedStops =
      (savedStops as StopRow[] | null)
        ?.map(flattenStop)
        .filter((s) => s.business !== null) ?? [];

    return successResponse({
      plan: { id: planId, title, target_date, stops: flattenedStops },
    });
  } catch {
    return generalErrorResponse();
  }
}

// DELETE /api/protected/mobile/plans/:planId
//
// Delete the plan and cascade its stops (ON DELETE CASCADE in the migration).
// Returns 204 No Content — no body to parse.
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { planId } = await params;

    // Verify ownership before deleting — RLS enforces this, but the explicit
    // filter ensures a 404 for non-existent or other-user plans.
    const { data, error: fetchError } = await auth.supabase
      .from('plans')
      .select('id')
      .eq('id', planId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (fetchError)
      return loggedServerError(
        'protected/mobile/plans/[planId]',
        fetchError,
        auth.user.id,
      );
    if (!data) return notFoundResponse({ message: 'Plan not found' });

    const { error: deleteError } = await auth.supabase
      .from('plans')
      .delete()
      .eq('id', planId);

    if (deleteError)
      return loggedServerError(
        'protected/mobile/plans/[planId]',
        deleteError,
        auth.user.id,
      );

    return new Response(null, { status: 204 });
  } catch {
    return generalErrorResponse();
  }
}
