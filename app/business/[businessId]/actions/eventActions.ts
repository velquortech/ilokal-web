'use server';

/**
 * Event proposals — business-owner Server Actions.
 *
 * Every export here is a publicly invocable endpoint, so each one: validates
 * with Zod before anything else, proves ownership with `verifyBusinessOwner`
 * and uses the VERIFIED business id (never the client's), and passes through a
 * per-user flood guard — Server-Action POSTs never reach the proxy's limiter.
 *
 * What is deliberately NOT here: approving or rejecting. An owner cannot reach
 * `approved` by any route — the DB trigger reverts it — so there is no action
 * to write, and none of these functions send a status the trigger would have
 * to argue with.
 */

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/supabase/server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import { businessEventsPath } from '@/config/routeConfig';
import * as eventService from '@/lib/api/events/eventService';
import {
  createEventSchema,
  updateEventSchema,
  eventIdSchema,
  ownerEventStatusSchema,
} from '@/lib/validation/events';
import {
  uploadWebP,
  ImageProcessingError,
  toWebPFilename,
  IMAGE_PRESETS,
} from '@/lib/api/helpers/image';
import type { ApiError, ApiResponse, Event } from '@/lib/types';

const RATE_LIMIT = Number(process.env.BUSINESS_ACTION_RATE_LIMIT ?? 30);
const RATE_WINDOW_MS = Number(
  process.env.BUSINESS_ACTION_RATE_WINDOW_MS ?? 60_000,
);

/** Images are capped well under the 3 MB Server Action body budget. */
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

type Guard =
  | { ok: true; businessId: string; userId: string }
  | { ok: false; response: ApiResponse<never> };

function fail(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}

/**
 * The gate every action opens with: feature on, caller owns the shop, caller
 * is inside their budget. Written once so a new action cannot ship with two of
 * the three.
 */
async function guard(): Promise<Guard> {
  // The kill switch is checked server-side too. Hiding the nav entry stops an
  // honest owner; it does not stop a POST to the action.
  if (!(await getEventsEnabled())) {
    return {
      ok: false,
      response: fail('NOT_FOUND', 'Events are not available.'),
    };
  }

  const verify = await verifyBusinessOwner();
  if (!verify.authorized) {
    return {
      ok: false,
      response: { success: false, error: verify.error as ApiError },
    };
  }

  const userId = verify.user?.id;
  if (userId) {
    const { allowed } = rateLimit(
      `business-event-write:${userId}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    );
    if (!allowed) {
      return {
        ok: false,
        response: fail(
          'RATE_LIMITED',
          'Too many requests — please try again in a moment.',
        ),
      };
    }
  }

  return { ok: true, businessId: verify.business!.id, userId: userId ?? '' };
}

function revalidate(businessId: string): void {
  revalidatePath(businessEventsPath(businessId));
}

/**
 * Create a proposal.
 *
 * `submit` decides whether it goes straight into the queue or stays a draft.
 * Either way the trigger has the final say, and `notifyProposalSubmitted`
 * refuses to ping anyone for a draft — so this cannot be used to spam admins.
 */
export async function createEventAction(
  input: unknown,
  submit = true,
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

    const result = await eventService.createEvent(
      g.businessId,
      parsed.data,
      submit ? 'pending_review' : 'draft',
    );

    if (result.success && submit && result.data) {
      // Non-fatal by design: a notification that does not arrive must not
      // fail, or appear to fail, the proposal it describes.
      await eventService.notifyProposalSubmitted(result.data.id);
    }

    if (result.success) revalidate(g.businessId);
    return result;
  } catch (error) {
    console.error('[createEventAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to create the event.');
  }
}

/**
 * Edit a proposal.
 *
 * Editing an APPROVED event sends it back for review — the trigger does that,
 * and the caller should tell the owner rather than let a published event
 * quietly vanish from the banner.
 */
export async function updateEventAction(
  id: string,
  input: unknown,
): Promise<ApiResponse<Event>> {
  try {
    if (!eventIdSchema.safeParse(id).success) {
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

    const result = await eventService.updateEvent(
      id,
      g.businessId,
      parsed.data,
    );
    if (result.success) revalidate(g.businessId);
    return result;
  } catch (error) {
    console.error('[updateEventAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to update the event.');
  }
}

/**
 * Submit a draft, or withdraw a proposal.
 *
 * The only two status moves an owner has. `ownerEventStatusSchema` refuses the
 * other two before the request leaves this function, and the trigger refuses
 * them again at the table.
 */
export async function setEventStatusAction(
  id: string,
  status: unknown,
): Promise<ApiResponse<Event>> {
  try {
    if (!eventIdSchema.safeParse(id).success) {
      return fail('VALIDATION_ERROR', 'Invalid event.');
    }

    const parsed = ownerEventStatusSchema.safeParse(status);
    if (!parsed.success) {
      return fail('VALIDATION_ERROR', 'You cannot set that status.');
    }

    const g = await guard();
    if (!g.ok) return g.response;

    const result = await eventService.setOwnerEventStatus(
      id,
      g.businessId,
      parsed.data,
    );

    if (result.success && parsed.data === 'pending_review') {
      await eventService.notifyProposalSubmitted(id);
    }

    if (result.success) revalidate(g.businessId);
    return result;
  } catch (error) {
    console.error('[setEventStatusAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to update the event.');
  }
}

/** Withdraw an event from the shop's list. Soft delete — the row stays. */
export async function archiveEventAction(
  id: string,
): Promise<ApiResponse<null>> {
  try {
    if (!eventIdSchema.safeParse(id).success) {
      return fail('VALIDATION_ERROR', 'Invalid event.');
    }

    const g = await guard();
    if (!g.ok) return g.response;

    const result = await eventService.archiveEvent(id, g.businessId);
    if (result.success) revalidate(g.businessId);
    return result;
  } catch (error) {
    console.error('[archiveEventAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to remove the event.');
  }
}

/**
 * Upload the event's image.
 *
 * Path is `<businessId>/<name>.webp` — the storage policy reads the first
 * segment and matches it against the caller's shops, so a forged path cannot
 * write into another shop's folder. Converted to WebP at write time because
 * the free Supabase plan has no on-the-fly transforms.
 */
export async function uploadEventImageAction(
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
    const path = `${g.businessId}/${Date.now()}-${toWebPFilename(file.name)}`;
    const url = await uploadWebP(supabase, 'event-images', path, file, {
      maxDimension: IMAGE_PRESETS.hero,
    });

    return { success: true, data: { url } };
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      return fail('VALIDATION_ERROR', 'That image could not be read.');
    }
    console.error('[uploadEventImageAction]', error);
    return fail('INTERNAL_ERROR', 'Failed to upload the image.');
  }
}
