import type { PriceType } from '@/lib/types';
import type {
  BookingMode,
  OfferingKind,
  ServiceLocation,
} from '@/lib/types/offering';

/**
 * Owner-facing copy for the offering enums. Shared by the add and update
 * dialogs — both need to render the same pickers, and a divergent copy is how
 * "Price on request" ends up worded two different ways.
 */

export const OFFERING_KIND_LABELS: Record<OfferingKind, string> = {
  product: 'Product',
  service: 'Service',
};

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: 'Fixed price',
  from: 'Starting from',
  per_hour: 'Per hour',
  per_day: 'Per day',
  per_person: 'Per person',
  per_event: 'Per event',
  on_request: 'Price on request (quote)',
};

/**
 * How customers transact an offering. Exposed in both dialogs rather than
 * silently taken from the vertical's default: under the Services/Tourism
 * profiles that default is `request`, which would otherwise put a permanent
 * "Request booking" button on a salon's retail shampoo with no way to remove
 * it.
 */
export const BOOKING_MODE_LABELS: Record<BookingMode, string> = {
  none: 'No booking — walk in or buy directly',
  inquiry: 'Inquiry only — customers contact you',
  request: 'Request a time — you confirm',
  timeslot: 'Appointment slot',
  date_range: 'Date range (rental)',
};

export const SERVICE_LOCATION_LABELS: Record<ServiceLocation, string> = {
  at_business: 'At our location',
  at_customer: 'We come to the customer',
  both: 'Either',
};
