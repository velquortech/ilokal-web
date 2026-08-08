import { NextRequest } from 'next/server';
import { createBearerClient } from '@/supabase/bearer';
import {
  badRequestResponse,
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import {
  MOBILE_EVENT_SELECT,
  normaliseMobileEvent,
  type MobileEventRow,
} from '@/app/api/helpers/mobileEvent';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { eventIdSchema } from '@/lib/validation/events';

/**
 * GET /api/mobile/events/:id — one approved, unarchived event.
 *
 * Backs mobile's `fetchEventDetail()` (services/events.ts), and — less
 * obviously — the heart button. `store/savedEventsStore.ts` snapshots the
 * whole event row into SecureStore when it is saved, so the Saved screen
 * renders offline; this route is how a saved event is re-opened and refreshed
 * long after it has fallen out of every feed page.
 *
 * Which is why the read is deliberately NOT date-filtered, matching the RLS
 * policy's own reasoning: a bookmarked or shared event must keep resolving
 * after it ends, or every link posted to Facebook 404s the next morning. The
 * client decides how to present a finished event; the API keeps answering.
 *
 * 404 — not 403 — for draft/pending/rejected/archived rows: a mobile client
 * has no UI for a status it is not allowed to see, and "this exists but you
 * may not have it" is information about an unpublished proposal.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // The kill switch answers 404 rather than an empty 200: the contract here
    // is a single `event` object, and there is no valid document to return.
    if (!(await getEventsEnabled())) {
      return notFoundResponse({ message: 'Event not found' });
    }

    const { id } = await params;

    // `z.guid()`, never a hand-rolled character class — the previous
    // `/^[0-9a-f-]{8,64}$/i` accepted `--------` and passed it to PostgREST as
    // a real query. Note `z.guid()` and NOT `z.uuid()`: Zod 4's `uuid()` is
    // strict RFC-9562 and rejects this app's own Postgres/seed UUIDs, which
    // would 400 every legitimate request (CLAUDE.md §Validation).
    const parsed = eventIdSchema.safeParse(id);
    if (!parsed.success) {
      return badRequestResponse({ message: 'Invalid event id' });
    }

    const supabase = createBearerClient();

    const { data, error } = await supabase
      .from('events')
      .select(MOBILE_EVENT_SELECT)
      .eq('id', parsed.data)
      .eq('status', 'approved')
      .is('archived_at', null)
      // `.maybeSingle()`, not `.single()`: "no such event" is a 404, not a
      // PGRST116 error path.
      .maybeSingle();

    if (error) {
      return loggedServerError('mobile/events/[id]', error);
    }
    if (!data) {
      return notFoundResponse({ message: 'Event not found' });
    }

    const event = normaliseMobileEvent(
      supabase,
      data as unknown as MobileEventRow,
    );

    return successResponse({ event });
  } catch {
    return generalErrorResponse();
  }
}
