import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { createPlanSchema } from '@/lib/validation/plans';
import { NextRequest } from 'next/server';

type StopRow = {
  position: number;
  businesses: { logo_url: string | null } | null;
};

// GET /api/protected/mobile/plans — list the current user's plans, each with a
// stop count and the first stop's business logo as a preview. The client splits
// Upcoming / Past from target_date, so no date filter is applied here.
export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { data, error } = await auth.supabase
      .from('plans')
      .select(
        `
        id, title, target_date,
        plan_stops(position, businesses(logo_url))
      `,
      )
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error)
      return loggedServerError('protected/mobile/plans', error, auth.user.id);

    const plans = (data ?? []).map((plan) => {
      // PostgREST generated types model the to-one `businesses` embed as an
      // array; the runtime payload is a row object or null. Cast through
      // `unknown` so the mismatch is explicit (same hardening as detail.ts).
      const stops = ((plan.plan_stops ?? []) as unknown as StopRow[])
        .slice()
        .sort((a, b) => a.position - b.position);
      return {
        id: plan.id,
        title: plan.title,
        target_date: plan.target_date,
        // Every stop counts, including one whose business is no longer
        // publicly readable. Counting only the visible ones made the list
        // disagree with the detail screen and understated the plan.
        stop_count: stops.length,
        // The preview is the first stop we can actually show a logo for —
        // an unverified leading stop falls through to the next one.
        preview_logo_url:
          stops.find((s) => s.businesses?.logo_url)?.businesses?.logo_url ??
          null,
      };
    });

    return successResponse({ plans });
  } catch {
    return generalErrorResponse();
  }
}

// POST /api/protected/mobile/plans — create an empty plan (title + date).
export async function POST(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const parsed = createPlanSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) {
      return badRequestResponse({ message: 'Invalid plan payload' });
    }
    const { title, target_date } = parsed.data;

    const { data, error } = await auth.supabase
      .from('plans')
      .insert({ user_id: auth.user.id, title, target_date })
      .select('id, title, target_date')
      .single();

    if (error)
      return loggedServerError('protected/mobile/plans', error, auth.user.id);

    // Return the plan in its GET-detail shape (empty stops) so the client's
    // create schema validates and the sheet can hand it straight to savePlan.
    return successResponse({ plan: { ...data, stops: [] } });
  } catch {
    return generalErrorResponse();
  }
}
