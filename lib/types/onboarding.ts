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
   * Offerings a shopper can actually see (`status='active'`) — what the
   * checklist row is asking about.
   */
  offeringCount: number;
  /**
   * Every live offering regardless of status. The dashboard's empty state asks
   * a different question — "has this owner added anything at all" — and using
   * the active count told a shop whose whole catalogue is `unlisted` that it
   * had none.
   */
  totalOfferingCount: number;
}

/**
 * The two facts about onboarding that are NOT derivable from anything else:
 * whether the tour was answered, and whether the card was hidden. Stored on
 * `business_settings` (migration `20260804233000`) rather than in localStorage,
 * so an owner who answers on their phone is not asked again on their laptop.
 */
export interface OnboardingState {
  /** Finished or skipped — both mean "do not offer it again". */
  tourCompleted: boolean;
  checklistDismissed: boolean;
  /**
   * The read failed. Both flags then read `false`, which SHOWS the guidance:
   * wrongly showing a card is a small annoyance, wrongly hiding the setup
   * checklist withholds the one thing a new owner needs.
   */
  failed: boolean;
}

export const EMPTY_ONBOARDING_STATE: OnboardingState = {
  tourCompleted: false,
  checklistDismissed: false,
  failed: true,
};

export const EMPTY_ONBOARDING_PROGRESS: OnboardingProgress = {
  items: [],
  completed: 0,
  total: 0,
  complete: false,
  failed: true,
  offeringCount: 0,
  totalOfferingCount: 0,
};
