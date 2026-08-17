import type { PriceType } from '@/lib/types';
import type { OfferingKind, ServiceLocation } from '@/lib/types/offering';

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

export const SERVICE_LOCATION_LABELS: Record<ServiceLocation, string> = {
  at_business: 'At our location',
  at_customer: 'We come to the customer',
  both: 'Either',
};
