import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  loggedServerError,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { createPlanSchema } from '@/lib/validation/plans';
import { NextRequest } from 'next/server';

// GET /api/protected/mobile/plans
//
// List every plan owned by the current user. Returns summary rows — no stops,
// no business joins — so the payload stays small and the client can split
// upcoming / past in one pass. The preview logo comes from the first stop's
// business; a plan with no stops has null logo.
export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { data, error } = await auth.supabase
      .from('plans')
      .select(
        `
        id, title, target_date,
        plan_stops(
          id,
          businesses(logo_url)
        )
      `,
      )
      .eq('user_id', auth.user.id)
      .order('target_date', { ascending: false });

    if (error)
      return loggedServerError('protected/mobile/plans', error, auth.user.id);

    const plans = (data ?? []).map((plan) => {
      const stops = plan.plan_stops ?? [];
      // First stop's logo serves as the plan preview — the same field the
      // mobile PlanSummary type expects.
      const firstLogo =
        stops.length > 0
          ? ((
              stops[0].businesses as unknown as {
                logo_url: string | null;
              } | null
            )?.logo_url ?? null)
          : null;

      return {
        id: plan.id,
        title: plan.title,
        target_date: plan.target_date,
        stop_count: stops.length,
        preview_logo_url: firstLogo,
      };
    });

    return successResponse({ plans });
  } catch {
    return generalErrorResponse();
  }
}

// POST /api/protected/mobile/plans
//
// Create an empty plan (title + date, no stops). The client adds stops via PUT
// on the detail endpoint. Returns the plan in its GET-detail shape so the
// client can immediately push to the detail screen without a refetch.
export async function POST(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const parsed = createPlanSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) {
      return badRequestResponse({
        message: 'title and target_date (YYYY-MM-DD) are required',
      });
    }

    const { title, target_date } = parsed.data;

    const { data, error } = await auth.supabase
      .from('plans')
      .insert({ user_id: auth.user.id, title, target_date })
      .select('id, title, target_date')
      .single();

    if (error)
      return loggedServerError('protected/mobile/plans', error, auth.user.id);

    return successResponse({
      plan: { ...data, stops: [] },
    });
  } catch {
    return generalErrorResponse();
  }
}
