/**
 * Booking write path.
 *
 * Every mutation goes through a SECURITY DEFINER RPC — the gate matrix,
 * the authorization split, and the ATOMIC availability check all live in
 * `20260727000005`, not here. This layer's only jobs are to call the RPC and
 * to translate SQLSTATEs into hand-written user copy: a raw driver message
 * leaks table/column/constraint names (CLAUDE.md error-leakage rule).
 *
 * There is deliberately no direct `.from('booking_requests').insert()` path —
 * the table has no INSERT policy, so a bypass attempt fails closed.
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  BookingDecision,
  BookingError,
  BookingRequest,
  CreateBookingRequest,
} from '@/lib/types/booking';
import type { ApiResponse } from '@/lib/types';

type PgError = { code?: string; message?: string };

/**
 * The RPCs raise with explicit SQLSTATEs so the caller never has to parse a
 * message. Anything unrecognized is a 500-class internal error.
 */
function mapBookingError(error: PgError): {
  code: BookingError;
  message: string;
} {
  switch (error.code) {
    case '42501':
      return { code: 'UNAUTHORIZED', message: 'Please sign in to continue.' };
    case 'P0002':
      return {
        code: 'NOT_FOUND',
        message: 'That booking is no longer available.',
      };
    // Private SQLSTATE class — only the booking RPCs raise IL0xx, so a message
    // carrying one is provably ours and safe to surface. Forwarding a generic
    // code like 22023 would also forward a built-in's internal message (e.g.
    // make_interval on an out-of-range value).
    case 'IL002':
      return {
        code: 'NO_AVAILABILITY',
        message: 'That slot was just taken. Please pick another time.',
      };
    case 'IL001':
      return {
        code: 'INVALID_REQUEST',
        message: error.message?.trim()
          ? capitalize(error.message.trim())
          : 'That booking request isn’t valid.',
      };
    default:
      return {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      };
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function requestBooking(
  input: CreateBookingRequest,
): Promise<ApiResponse<BookingRequest>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc('request_booking', {
      p_product_id: input.product_id,
      p_starts_at: input.starts_at,
      p_ends_at: input.ends_at ?? undefined,
      p_branch_id: input.branch_id ?? undefined,
      p_party_size: input.party_size ?? undefined,
      p_notes: input.notes ?? undefined,
    });

    if (error) {
      console.error('[requestBooking]', error);
      return { success: false, error: mapBookingError(error) };
    }

    return { success: true, data: data as unknown as BookingRequest };
  } catch (err) {
    console.error('[requestBooking]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    };
  }
}

export async function decideBooking(
  bookingId: string,
  decision: BookingDecision,
  options: { note?: string | null; quotedAmount?: number | null } = {},
): Promise<ApiResponse<BookingRequest>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc('decide_booking', {
      p_booking_id: bookingId,
      p_status: decision,
      p_decision_note: options.note ?? undefined,
      p_quoted_amount: options.quotedAmount ?? undefined,
    });

    if (error) {
      console.error('[decideBooking]', error);
      return { success: false, error: mapBookingError(error) };
    }

    return { success: true, data: data as unknown as BookingRequest };
  } catch (err) {
    console.error('[decideBooking]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    };
  }
}

export async function cancelBooking(
  bookingId: string,
): Promise<ApiResponse<BookingRequest>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
    });

    if (error) {
      console.error('[cancelBooking]', error);
      return { success: false, error: mapBookingError(error) };
    }

    return { success: true, data: data as unknown as BookingRequest };
  } catch (err) {
    console.error('[cancelBooking]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    };
  }
}
