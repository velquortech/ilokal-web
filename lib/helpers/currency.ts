/**
 * Currency formatting utilities
 * Centralized format configurations for different currencies
 */

export const phFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});
