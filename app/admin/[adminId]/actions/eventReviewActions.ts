'use server';

/**
 * Event review — admin Server Actions.
 *
 * Two things happen on every decision, and neither is optional: the event's
 * status moves, and the shop owner is told why. A rejection the owner cannot
 * read is not a review.
 *
 * The owner-facing notification goes through the EXISTING `emitNotification`
 * service, because `create_notification` already authorises an admin caller —
 * there is no new SQL on this side. (The other direction, owner → admins, does
 * need its own RPC; that is `notify_event_proposal_submitted`, called from the
 * owner's action.)
 */

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/supabase/server';
import { verifyCurrentUserIsAdmin } from '@/lib/api/admin/adminActionHelpers';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { emitNotification } from '@/lib/api/notifications/notificationsService';
import { getBusinessById } from '@/lib/api/business/businessQuery';
import * as eventService from '@/lib/api/events/eventService';
import {
  createEventSchema,
  eventDecisionSchema,
  eventIdSchema,
  updateEventSchema,
} from '@/lib/validation/events';
import {
  uploadWebP,
  ImageProcessingError,
  toWebPFilename,
  IMAGE_PRESETS,
} from '@/lib/api/helpers/image';
import type { ApiResponse, Event, NotificationType } from '@/lib/types';

/** Same caps the owner's upload enforces — one number, one meaning. */
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

function fail(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}

type AdminGuard =
  | { ok: true; adminId: string }
  | { ok: false; response: ApiResponse<never> };

/**
 * Role is re-derived server-side on every call. The admin layout's segment
 * check guards navigation; it does not guard a POST to this action.
 */
async function guard(): Promise<AdminGuard> {
  if (!(await getEventsEnabled())) {
    return {
      ok: false,
      response: fail('NOT_FOUND', 'Events are not available.'),
    };
  }

  const check = await verifyCurrentUserIsAdmin();
  if (!check.authorized) {
    return { ok: false, response: fail('UNAUTHORIZED', 'Not authorized.') };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: fail('UNAUTHORIZED', 'Not authorized.') };
  }

  return { ok: true, adminId: user.id };
}

function revalidate(): void {
  revalidatePath('/admin', 'layout');
  // The owner's own list and every public surface change too.
  revalidatePath('/business', 'layout');
  revalidatePath('/events');
  revalidatePath('/explore');
}

/**
 * Approve or reject a proposal.
 *
 * `reviewDecisionSchema`'s rule — a reason is required on reject — is enforced
 * HERE, not only in the form: this is a callable endpoint, and a rejection with
 * no explanation leaves the owner nothing to act on.
 */
export async function decideEventAction(
  eventId: string,
  input: unknown,
): Promise<ApiResponse<Event>> {
  try {
    if (!eventIdSchema.safeParse(eventId).success) {
      return fail('VALIDATION_ERROR', 'Invalid event.');
    }

    const parsed = eventDecisionSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid decision.',
      );
    }

    const g = await guard();
    if (!g.ok) return g.response;

    const { decision, note, priority } = parsed.data;

    const result = await eventService.decideEvent(
      eventId,
      g.adminId,
      decision,
      note,
      priority,
    );
    if (!result.success || !result.data) return result;

    await notifyOwner(result.data, decision, note, g.adminId);
    revalidate();
    return result;
  } catch (error) {
    console.error('[decideEventAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to record the decision.');
  }
}

/**
 * Tell the shop owner what happened, carrying the reviewer's note.
 *
 * The note goes in `metadata.remarks` — the key `NotificationRow` already
 * renders in italics — rather than a new column or a new component.
 *
 * Never throws and never fails the decision: the same rule
 * `notify_coupon_redemption` established. A notification that does not arrive
 * must not undo the review it describes.
 */
async function notifyOwner(
  event: Event,
  decision: 'approve' | 'reject',
  note: string | undefined,
  adminId: string,
): Promise<void> {
  // A platform event has no owner to tell.
  if (!event.business_id) return;

  try {
    const { business } = await getBusinessById(event.business_id);
    const ownerId = business?.owner_id;
    if (!ownerId) return;

    const type: NotificationType =
      decision === 'approve'
        ? 'event_proposal_approved'
        : 'event_proposal_rejected';

    const notify = await emitNotification({
      user_id: ownerId,
      type,
      title: decision === 'approve' ? 'Event approved' : 'Event not approved',
      body:
        decision === 'approve'
          ? `“${event.name}” is now live on iLokal.`
          : `“${event.name}” was not approved.`,
      business_id: event.business_id,
      actor_id: adminId,
      metadata: {
        event_id: event.id,
        event_name: event.name,
        ...(note ? { remarks: note } : {}),
      },
    });

    if (!notify.success) {
      console.error('[decideEventAction] notify failed', notify.error);
    }
  } catch (error) {
    console.error('[decideEventAction] notify threw', error);
  }
}

/**
 * Banner order. Admin-only — the DB trigger zeroes any value an owner sends,
 * so this is the only way a number other than 0 gets there.
 */
export async function setEventPriorityAction(
  eventId: string,
  priority: number,
): Promise<ApiResponse<Event>> {
  try {
    if (!eventIdSchema.safeParse(eventId).success) {
      return fail('VALIDATION_ERROR', 'Invalid event.');
    }
    if (!Number.isInteger(priority) || priority < 0 || priority > 100) {
      return fail('VALIDATION_ERROR', 'Priority must be between 0 and 100.');
    }

    const g = await guard();
    if (!g.ok) return g.response;

    const result = await eventService.setEventPriority(eventId, priority);
    if (result.success) revalidate();
    return result;
  } catch (error) {
    console.error('[setEventPriorityAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to update the order.');
  }
}

/**
 * Create a platform event — one iLokal is running itself, with no shop behind
 * it. Published immediately: an admin authoring an event IS the review.
 */
export async function createPlatformEventAction(
  input: unknown,
): Promise<ApiResponse<Event>> {
  try {
    const parsed = createEventSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Check the form and try again.',
      );
    }

    const g = await guard();
    if (!g.ok) return g.response;

    // A platform event promotes no shop's offering, so `product_id` is
    // dropped rather than trusted — the composite FK would reject it anyway
    // (it requires a business_id), but dropping it here says why.
    const rest = { ...parsed.data, product_id: null };

    const result = await eventService.createPlatformEvent(rest, 'approved');
    if (result.success) revalidate();
    return result;
  } catch (error) {
    console.error('[createPlatformEventAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to create the event.');
  }
}

/**
 * Edit a staff pick.
 *
 * Only a platform event — the service scopes the write `business_id IS NULL`.
 * A shop's event is changed by rejecting it with a reason, so the owner learns
 * what happened to the thing they wrote.
 */
export async function updatePlatformEventAction(
  eventId: string,
  input: unknown,
): Promise<ApiResponse<Event>> {
  try {
    if (!eventIdSchema.safeParse(eventId).success) {
      return fail('VALIDATION_ERROR', 'Invalid event.');
    }

    const parsed = updateEventSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Check the form and try again.',
      );
    }

    const g = await guard();
    if (!g.ok) return g.response;

    const result = await eventService.updatePlatformEvent(eventId, parsed.data);
    if (result.success) revalidate();
    return result;
  } catch (error) {
    console.error('[updatePlatformEventAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to update the event.');
  }
}

/** Take a staff pick down. Soft delete — platform events only. */
export async function archivePlatformEventAction(
  eventId: string,
): Promise<ApiResponse<null>> {
  try {
    if (!eventIdSchema.safeParse(eventId).success) {
      return fail('VALIDATION_ERROR', 'Invalid event.');
    }

    const g = await guard();
    if (!g.ok) return g.response;

    const result = await eventService.archivePlatformEvent(eventId);
    if (result.success) revalidate();
    return result;
  } catch (error) {
    console.error('[archivePlatformEventAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to remove the event.');
  }
}

/**
 * Upload a staff pick's image.
 *
 * Path is `platform/<file>.webp`. The bucket's write policy permits an admin
 * any path, but a shop's folder is a shop's folder — keeping platform images
 * under one prefix is what makes "whose image is this?" answerable from the
 * path alone, exactly as the owner's `<businessId>/` prefix does.
 */
export async function uploadPlatformEventImageAction(
  formData: FormData,
): Promise<ApiResponse<{ url: string }>> {
  try {
    const g = await guard();
    if (!g.ok) return g.response;

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return fail('VALIDATION_ERROR', 'No file provided.');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return fail('VALIDATION_ERROR', 'The image must be under 2 MB.');
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return fail('VALIDATION_ERROR', 'Use a JPEG, PNG, GIF or WebP image.');
    }

    const supabase = await createServerSupabaseClient();
    const path = `platform/${Date.now()}-${toWebPFilename(file.name)}`;
    const url = await uploadWebP(supabase, 'event-images', path, file, {
      maxDimension: IMAGE_PRESETS.hero,
    });

    return { success: true, data: { url } };
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return fail('VALIDATION_ERROR', 'That image could not be read.');
    }
    console.error('[uploadPlatformEventImageAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to upload the image.');
  }
}
