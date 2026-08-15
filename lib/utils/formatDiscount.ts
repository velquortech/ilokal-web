import type { DiscountValue } from '@/lib/types';

/**
 * The one place a stored `DiscountValue` becomes the text an owner or cashier
 * reads ("10% off", "₱50 off", "FREE", "Buy 1 Get 1 FREE"). Used by the
 * coupon table, the redemptions table, and the promo dialog's preview — a
 * second spelling of any arm drifts the moment a new type ships.
 */
export function formatDiscountValue(discount: DiscountValue): string {
  switch (discount.type) {
    case 'percentage':
      return `${discount.value}% off`;
    case 'fixed_amount':
      return `₱${discount.value} off`;
    case 'free':
      return 'FREE';
    case 'bogo':
      return `Buy ${discount.buy} Get ${discount.get} FREE`;
  }
}
