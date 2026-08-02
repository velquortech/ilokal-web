/**
 * Event writes.
 *
 * Writes go straight to the table — there is no RPC, because every rule is
 * already a constraint, a policy or a trigger, and the DB enforces all of them
 * against a direct PostgREST call too: ownership (RLS), who may reach
 * `approved` (the status triggers), cross-shop promotion (the composite FK),
 * link schemes and date ordering (CHECKs).
 *
 * This layer's job is the same as `sectionService`'s: turn a SQLSTATE into
 * copy the person on the other end can act on. A raw driver message names
 * tables, columns and constraints, so it never reaches a client.
 *
 * One thing to keep in mind reading this file: `status` is NOT set here on the
 * owner's behalf. The trigger decides it. Sending `status: 'approved'` from
 * this layer as a business owner would be silently downgraded — which is the
 * design, not a bug to work around.
 */

import { createServerSupabaseClient } from '@/supabase/server';
import { describeDbError } from '@/lib/utils/describeDbError';
import type { ApiResponse, Event, EventStatus } from '@/lib/types';
import type {
  CreateEventInput,
  UpdateEventInput,
} from '@/lib/validation/events';

type PgError = { code?: string; message?: string };

export type EventErrorCode =
  | 'INVALID_INPUT'
  | 'CROSS_SHOP_PRODUCT'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';

function mapEventError(error: PgError): {
  code: EventErrorCode;
  message: string;
} {
  switch (error.code) {
    case '23503':
      // The composite FK (product_id, business_id). The only way to trip it is
      // to name an offering that is not yours.
      return {
        code: 'CROSS_SHOP_PRODUCT',
        message: 'That offering does not belong to this shop.',
      };
    case '23514':
      // One of the CHECKs: name/address length, date order, the paired daily
      // window, or a link that is not http(s). The message stays generic —
      // naming the constraint would name the column and the table.
      return {
        code: 'INVALID_INPUT',
        message: 'Check the dates, times and links, then try again.',
      };
    case '42501':
      return {
        code: 'UNAUTHORIZED',
        message: 'You do not have access to this event.',
      };
    case 'PGRST116':
      return { code: 'NOT_FOUND', message: 'That event no longer exists.' };
    default:
      return {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      };
  }
}

function failure(error: PgError, context: string): ApiResponse<never> {
  console.error(`[${context}]`, describeDbError(error));
  return { success: false, error: mapEventError(error) };
}

/**
 * PostGIS wants WKT; the form gives two numbers. `POINT(lng lat)` — longitude
 * FIRST, which is the opposite of how everyone says it out loud and the reason
 * a swapped pair lands the pin in the Indian Ocean rather than erroring.
 */
function toPoint(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string | null {
  if (latitude == null || longitude == null) return null;
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}

/** Columns a client may set, mapped from validated input. */
function toRow(input: Partial<CreateEventInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (input.name !== undefined) row.name = input.name;
  if (input.description !== undefined) row.description = input.description;
  if (input.address !== undefined) row.address = input.address;
  if (input.image_url !== undefined) row.image_url = input.image_url;
  if (input.starts_at !== undefined) row.starts_at = input.starts_at;
  if (input.ends_at !== undefined) row.ends_at = input.ends_at;
  if (input.daily_start_time !== undefined)
    row.daily_start_time = input.daily_start_time;
  if (input.daily_end_time !== undefined)
    row.daily_end_time = input.daily_end_time;
  if (input.link_url !== undefined) row.link_url = input.link_url;
  if (input.ticket_url !== undefined) row.ticket_url = input.ticket_url;
  if (input.product_id !== undefined) row.product_id = input.product_id;

  // `location` is written ONLY when a real pair arrives.
  //
  // The previous rule — write whenever either key was present — meant a form
  // that always sent `latitude: null, longitude: null` (which the edit dialog
  // did, because nothing read the stored point back) silently erased the
  // coordinates on every save, dropping the event out of `events_nearby` and
  // the mobile endpoint.
  //
  // The cost is that this cannot CLEAR a point. That is the right way round:
  // an event with a stale pin is findable, an event with none is not.
  if (
    typeof input.latitude === 'number' &&
    typeof input.longitude === 'number'
  ) {
    row.location = toPoint(input.latitude, input.longitude);
  }

  return row;
}

/**
 * Create a shop's event.
 *
 * `business_id` is the caller's VERIFIED business, never a value from the
 * client. `status` is passed through as the owner's intent — draft or
 * submitted — and the trigger has the final say.
 */
export async function createEvent(
  businessId: string,
  input: CreateEventInput,
  status: Extract<EventStatus, 'draft' | 'pending_review'> = 'pending_review',
): Promise<ApiResponse<Event>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('events')
      .insert({ ...toRow(input), business_id: businessId, status })
      .select('*')
      .single();

    if (error) return failure(error, 'createEvent');
    return { success: true, data: data as Event };
  } catch (err) {
    return failure(err as PgError, 'createEvent');
  }
}

/**
 * Create a platform event. Admin-only by RLS; `business_id` stays null, and an
 * admin's chosen status stands because the trigger exempts admins.
 */
export async function createPlatformEvent(
  input: CreateEventInput,
  status: EventStatus = 'approved',
): Promise<ApiResponse<Event>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('events')
      .insert({ ...toRow(input), business_id: null, status })
      .select('*')
      .single();

    if (error) return failure(error, 'createPlatformEvent');
    return { success: true, data: data as Event };
  } catch (err) {
    return failure(err as PgError, 'createPlatformEvent');
  }
}

/**
 * Update an event's content.
 *
 * Scoped by `business_id` in the WHERE, not checked beforehand: ownership
 * becomes part of the write, so another shop's id simply does not match. RLS
 * says the same thing; this is the belt to its braces, and it costs nothing.
 *
 * Editing an APPROVED event sends it back to `pending_review` — the trigger
 * does that, and callers should tell the owner so rather than being surprised.
 */
export async function updateEvent(
  id: string,
  businessId: string,
  input: UpdateEventInput,
): Promise<ApiResponse<Event>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('events')
      .update(toRow(input))
      .eq('id', id)
      .eq('business_id', businessId)
      .is('archived_at', null)
      .select('*')
      .maybeSingle();

    if (error) return failure(error, 'updateEvent');
    if (!data) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'That event no longer exists.' },
      };
    }
    return { success: true, data: data as Event };
  } catch (err) {
    return failure(err as PgError, 'updateEvent');
  }
}

/**
 * Move an event between the two states an owner controls: submit a draft, or
 * withdraw a proposal. Approve and reject are not here — the trigger reverts
 * either if a non-admin attempts it.
 */
export async function setOwnerEventStatus(
  id: string,
  businessId: string,
  status: Extract<EventStatus, 'draft' | 'pending_review'>,
): Promise<ApiResponse<Event>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', id)
      .eq('business_id', businessId)
      .is('archived_at', null)
      .select('*')
      .maybeSingle();

    if (error) return failure(error, 'setOwnerEventStatus');
    if (!data) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'That event no longer exists.' },
      };
    }
    return { success: true, data: data as Event };
  } catch (err) {
    return failure(err as PgError, 'setOwnerEventStatus');
  }
}

/**
 * Soft-delete. The row stays so a shared link keeps resolving to something
 * rather than 404ing, and so an admin can still see what was withdrawn.
 */
export async function archiveEvent(
  id: string,
  businessId: string,
): Promise<ApiResponse<null>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('events')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', businessId)
      .is('archived_at', null)
      .select('id')
      .maybeSingle();

    if (error) return failure(error, 'archiveEvent');
    if (!data) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'That event no longer exists.' },
      };
    }
    return { success: true, data: null };
  } catch (err) {
    return failure(err as PgError, 'archiveEvent');
  }
}

/**
 * An admin's decision on a proposal.
 *
 * Deliberately NOT scoped by business — an admin decides for every shop, and
 * the admin RLS policy is what authorises it. The caller must already have
 * proven the role; this layer does not re-derive it.
 */
export async function decideEvent(
  id: string,
  adminId: string,
  decision: 'approve' | 'reject',
  note?: string,
  priority?: number,
): Promise<ApiResponse<Event>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('events')
      .update({
        status: decision === 'approve' ? 'approved' : 'rejected',
        review_note: note ?? null,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        ...(priority !== undefined && { priority }),
      })
      .eq('id', id)
      .is('archived_at', null)
      // Only a proposal awaiting a decision can be decided. Without this, two
      // admins opening the queue together both "approve" and the second
      // silently overwrites the first's note and timestamp.
      .eq('status', 'pending_review')
      .select('*')
      .maybeSingle();

    if (error) return failure(error, 'decideEvent');
    if (!data) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'That proposal has already been decided.',
        },
      };
    }
    return { success: true, data: data as Event };
  } catch (err) {
    return failure(err as PgError, 'decideEvent');
  }
}

/** Banner order. Admin-only — the trigger zeroes an owner's attempt. */
export async function setEventPriority(
  id: string,
  priority: number,
): Promise<ApiResponse<Event>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('events')
      .update({ priority })
      .eq('id', id)
      .is('archived_at', null)
      .select('*')
      .maybeSingle();

    if (error) return failure(error, 'setEventPriority');
    if (!data) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'That event no longer exists.' },
      };
    }
    return { success: true, data: data as Event };
  } catch (err) {
    return failure(err as PgError, 'setEventPriority');
  }
}

/**
 * Tell every admin a proposal is waiting.
 *
 * Via the RPC, because `create_notification` authorises the caller as admin OR
 * the recipient, and here the caller is neither — an owner writing to admins.
 *
 * Never throws and never reports failure upward: a notification that does not
 * arrive must not roll back, or even appear to fail, the proposal it describes.
 * Returns how many admins were told, for logging.
 */
export async function notifyProposalSubmitted(
  eventId: string,
): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc(
      'notify_event_proposal_submitted',
      { p_event_id: eventId },
    );

    if (error) {
      console.error('[notifyProposalSubmitted]', describeDbError(error));
      return 0;
    }
    return typeof data === 'number' ? data : 0;
  } catch (err) {
    console.error('[notifyProposalSubmitted]', err);
    return 0;
  }
}
