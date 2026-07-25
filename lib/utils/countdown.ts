/**
 * Wallet countdown formatting — pure, testable.
 * The redemption window is the coupon's whole validity window
 * (`user_redemptions.expires_at` = coupon `expiry_date`).
 */

export interface TimeLeft {
  expired: boolean;
  label: string;
  /** True inside the last 24h — UI renders the urgent style. */
  urgent: boolean;
}

export function timeLeft(expiresAt: string | null, nowMs: number): TimeLeft {
  if (!expiresAt) {
    return { expired: false, label: 'No expiry', urgent: false };
  }
  const diff = Date.parse(expiresAt) - nowMs;
  if (Number.isNaN(diff)) {
    return { expired: false, label: '', urgent: false };
  }
  if (diff <= 0) return { expired: true, label: 'Expired', urgent: false };

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 2)
    return { expired: false, label: `${days} days left`, urgent: false };
  if (hours >= 1) {
    return {
      expired: false,
      label: `${hours}h ${minutes % 60}m left`,
      urgent: hours < 24,
    };
  }
  if (minutes >= 1) {
    return { expired: false, label: `${minutes}m left`, urgent: true };
  }
  return { expired: false, label: 'Less than a minute', urgent: true };
}
