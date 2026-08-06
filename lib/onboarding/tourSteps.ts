import type { OfferingVocabulary } from '@/lib/types/offering';

/**
 * The post-registration guided tour.
 *
 * **The id IS the anchor.** Each value below is written verbatim as a
 * `data-tour="<id>"` attribute on an element that already exists — a nav link,
 * the branch switcher, the notification bell, the setup card. No wrapper whose
 * only job is to be measured.
 *
 * Keying the map by a string union is the `LandingSection` contract lesson:
 * renaming a section id without updating the union turned `/explore`'s nav into
 * dead links, twice. Here a renamed id is a compile error at every `data-tour`
 * call site, because `NavItem.tourId` is typed as `TourStepId` and
 * `tourSteps.contract.test.ts` sweeps the source for the rest.
 */
export type TourStepId =
  | 'setup-checklist'
  | 'nav-catalogue'
  | 'nav-coupons'
  | 'nav-shop'
  | 'nav-bookings'
  | 'branch-switcher'
  | 'notifications';

/**
 * `app_settings` kill switches a step may depend on. Spelled the way the nav
 * config spells them, because the tour is filtered by the SAME `flags` record
 * `BusinessSidebar` filters by — a step naming a route that 404s is exactly the
 * failure ON7 exists to prevent.
 */
export type TourStepFlag = 'enable_bookings' | 'enable_events';

export interface TourStep {
  id: TourStepId;
  title: (vocabulary: OfferingVocabulary) => string;
  body: (vocabulary: OfferingVocabulary) => string;
  /** Absent = always shown. Present = shown only when that flag is true. */
  flag?: TourStepFlag;
  /** Preferred side for the step card; the popover still collision-flips. */
  side: 'top' | 'right' | 'bottom' | 'left';
  /**
   * The anchor lives inside the sidebar, which an owner may have collapsed —
   * so a tour that does not open it points at an icon, or at nothing at all.
   */
  inSidebar?: boolean;
}

export interface ResolvedTourStep {
  id: TourStepId;
  title: string;
  body: string;
  side: TourStep['side'];
  inSidebar: boolean;
}

export const TOUR_STEPS: Record<TourStepId, TourStep> = {
  'setup-checklist': {
    id: 'setup-checklist',
    title: () => 'Your setup checklist',
    body: () =>
      'Everything a shopper needs before your shop is usable. Each row links straight to the page that finishes it.',
    side: 'bottom',
  },
  'nav-catalogue': {
    id: 'nav-catalogue',
    title: (v) => v.catalogue,
    body: (v) =>
      `Add and edit your ${v.plural.toLowerCase()} here. Your public shop page stays empty until at least one is listed.`,
    side: 'right',
    inSidebar: true,
  },
  'nav-coupons': {
    id: 'nav-coupons',
    title: () => 'Coupons & Deals',
    body: () =>
      'A published deal reaches the app’s Deals feed and the shoppers who follow you. A draft reaches nobody.',
    side: 'right',
    inSidebar: true,
  },
  'nav-shop': {
    id: 'nav-shop',
    title: () => 'My Shop',
    body: (v) =>
      `Your public page, as a shopper sees it — hours, contact, photos and your ${v.plural.toLowerCase()}.`,
    side: 'right',
    inSidebar: true,
  },
  'nav-bookings': {
    id: 'nav-bookings',
    title: () => 'Bookings',
    body: (v) =>
      `Requests to book one of your ${v.plural.toLowerCase()} land here. Confirm, decline or quote each one.`,
    flag: 'enable_bookings',
    side: 'right',
    inSidebar: true,
  },
  'branch-switcher': {
    id: 'branch-switcher',
    title: () => 'Branch switcher',
    body: () =>
      'Analytics, offerings and redemptions can all be narrowed to a single branch from here.',
    side: 'bottom',
  },
  notifications: {
    id: 'notifications',
    title: () => 'Notifications',
    body: () =>
      'Redemptions, booking requests and decisions on your shop arrive here.',
    side: 'bottom',
  },
};

/** Reading order. The checklist first, because it is the one with work in it. */
export const TOUR_ORDER: TourStepId[] = [
  'setup-checklist',
  'nav-catalogue',
  'nav-coupons',
  'nav-shop',
  'nav-bookings',
  'branch-switcher',
  'notifications',
];

/**
 * Copy resolved once per render of the tour.
 *
 * Flag filtering happens HERE rather than at paint time, so a step for a dark
 * feature never counts toward "step 3 of 7" either.
 */
export function resolveTourSteps({
  vocabulary,
  flags = {},
}: {
  vocabulary: OfferingVocabulary;
  flags?: Record<string, boolean>;
}): ResolvedTourStep[] {
  return TOUR_ORDER.map((id) => TOUR_STEPS[id])
    .filter((step) => !step.flag || flags[step.flag] === true)
    .map((step) => ({
      id: step.id,
      title: step.title(vocabulary),
      body: step.body(vocabulary),
      side: step.side,
      inSidebar: step.inSidebar === true,
    }));
}

/** `document.querySelector` selector for a step's anchor. */
export function tourAnchorSelector(id: TourStepId): string {
  return `[data-tour="${id}"]`;
}
