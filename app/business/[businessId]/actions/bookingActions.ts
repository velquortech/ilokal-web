'use server';

/**
 * Owner-side booking decisions (phase 4).
 *
 * The authorization itself lives in `decide_booking()` — it re-derives the
 * owner from the booking's business inside a SECURITY DEFINER function, so a
 * forged bookingId can never reach another business's row. `verifyBusinessOwner`
 * here is defense in depth plus the source of the revalidate path.
 */

import { revalidatePath } from 'next/cache';
import verifyBusinessOwner from '@/lib/api/verifyBusinessOwner';
import { decideBooking } from '@/lib/api/bookings/bookingService';
import {
  BOOKING_DECISIONS,
  type BookingDecision,
  type BookingRequest,
} from '@/lib/types/booking';
import { businessPath } from '@/config/routeConfig';

type DecideResult =
  | { ok: true; booking: BookingRequest }
  | { ok: false; message: string };

export async function decideBookingAction(
  businessId: string,
  bookingId: string,
  decision: BookingDecision,
  options: { note?: string | null; quotedAmount?: number | null } = {},
): Promise<DecideResult> {
  try {
    if (!(BOOKING_DECISIONS as readonly string[]).includes(decision)) {
      return { ok: false, message: 'That decision isn’t valid.' };
    }

    const verify = await verifyBusinessOwner(businessId);
    if (!verify.authorized) {
      return { ok: false, message: 'You can’t manage this business.' };
    }

    const result = await decideBooking(bookingId, decision, options);
    if (!result.success || !result.data) {
      return {
        ok: false,
        message: result.error?.message ?? 'Could not update this booking.',
      };
    }

    revalidatePath(businessPath(businessId, 'bookings'));
    return { ok: true, booking: result.data };
  } catch (err) {
    console.error('[decideBookingAction]', err);
    return { ok: false, message: 'Could not update this booking right now.' };
  }
}
