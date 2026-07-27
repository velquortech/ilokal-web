/**
 * Booking Domain Types (phase 4)
 *
 * Request-based, not slot-based: the customer proposes a time, the owner
 * confirms or declines. See `.claude/OFFERINGS_MODEL.md` phase 4.
 */

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export const BOOKING_STATUSES: readonly BookingStatus[] = [
  'pending',
  'confirmed',
  'declined',
  'cancelled',
  'completed',
  'no_show',
] as const;

/** The transitions an owner may apply. Customers only ever `cancel`. */
export type BookingDecision =
  | 'confirmed'
  | 'declined'
  | 'completed'
  | 'no_show';

export const BOOKING_DECISIONS: readonly BookingDecision[] = [
  'confirmed',
  'declined',
  'completed',
  'no_show',
] as const;

/** A booking still awaiting or holding a slot — what availability counts. */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  'pending',
  'confirmed',
] as const;

export type BookingRequest = {
  id: string;
  business_id: string;
  product_id: string;
  user_id: string;
  branch_id: string | null;
  starts_at: string;
  /** Null for a point-in-time booking with no duration on the offering. */
  ends_at: string | null;
  party_size: number | null;
  status: BookingStatus;
  notes: string | null;
  /** The owner's answer for an `on_request` offering. Display only. */
  quoted_amount: number | null;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
};

/** Joined shape the owner inbox and the customer list render. */
export type BookingWithContext = BookingRequest & {
  product: { id: string; name: string; image_url: string | null } | null;
  branch: { id: string; name: string } | null;
  customer: { id: string; full_name: string | null } | null;
  business: { id: string; shop_name: string; logo_url: string | null } | null;
};

export type CreateBookingRequest = {
  product_id: string;
  starts_at: string;
  ends_at?: string | null;
  branch_id?: string | null;
  party_size?: number | null;
  notes?: string | null;
};

export type BookingFilters = {
  status?: BookingStatus | '';
  page?: number;
  per_page?: number;
};

export type PaginatedBookingsResponse = {
  bookings: BookingWithContext[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

/**
 * Error codes the RPCs raise, mapped from SQLSTATE by
 * `lib/api/bookings/bookingService.ts`. Every one has hand-written user copy —
 * a raw driver message must never reach the client (CLAUDE.md error-leakage).
 */
export type BookingError =
  | 'BOOKINGS_DISABLED'
  | 'NOT_FOUND'
  | 'NOT_BOOKABLE'
  | 'NO_AVAILABILITY'
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';
