import type { BusinessVerificationStatus } from './business';

/**
 * Post-registration setup checklist.
 *
 * Every item's done-state is DERIVED from the data it describes — nothing here
 * is stored. Storing "logo uploaded ✓" duplicates a fact `businesses.logo_url`
 * already holds, and the two drift the first time an owner deletes the logo.
 */
export type OnboardingItemId =
  | 'profile'
  | 'branch'
  | 'hours'
  | 'offering'
  | 'promo'
  | 'verification';

export interface OnboardingItem {
  id: OnboardingItemId;
  /** Imperative label. Vocabulary-aware where the noun differs per vertical. */
  label: string;
  /** One line on why it matters — the reason, not a restatement. */
  detail: string;
  done: boolean;
  href: string;
  /**
   * An item the owner cannot action (verification). Shown for context, and
   * excluded from BOTH sides of the completion ratio — counting a step nobody
   * can take makes the bar permanently short through no fault of theirs.
   */
  readOnly?: boolean;
  /** Only set on the verification row. */
  status?: BusinessVerificationStatus | null;
}

export interface OnboardingProgress {
  items: OnboardingItem[];
  /** Actionable items done. Read-only items are not counted. */
  completed: number;
  /** Actionable items total. */
  total: number;
  /** Every actionable item is done. */
  complete: boolean;
  /**
   * A read failed. The card must say so rather than render unchecked boxes —
   * an unchecked box caused by an outage tells the owner to redo finished
   * work. Same rule as `EventStats.failed` / `getBookingStats`.
   */
  failed: boolean;
  /**
   * Live offering count, surfaced because the dashboard's empty state needs
   * the same number and must not pay for a second round trip to get it.
   */
  offeringCount: number;
}

export const EMPTY_ONBOARDING_PROGRESS: OnboardingProgress = {
  items: [],
  completed: 0,
  total: 0,
  complete: false,
  failed: true,
  offeringCount: 0,
};
