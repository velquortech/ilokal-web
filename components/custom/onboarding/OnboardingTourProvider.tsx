'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import { completeOnboardingTourAction } from '@/app/actions/onboardingActions';
import { resolveTourSteps } from '@/lib/onboarding/tourSteps';
import { TourOverlay } from './TourOverlay';

interface OnboardingTourContextValue {
  /** The `enable_onboarding_tour` kill switch. False hides every entry point. */
  enabled: boolean;
  /**
   * Start the tour outright — the two replay entries.
   *
   * `returnFocusTo` is where focus goes when the tour ends. Pass it explicitly
   * from a Radix menu: the menu's own focus restore happens on UNMOUNT, after
   * its exit animation, so reading `document.activeElement` at click time
   * records a menu item that is detached moments later and the restore lands on
   * `<body>`. Omit it and the currently focused element is used, which is right
   * for a plain button — including when this is passed directly as an `onClick`
   * handler and the argument is a click event, which is ignored.
   */
  startTour: (returnFocusTo?: unknown) => void;
  /**
   * Offer the tour. Called once, by the post-registration arrival. A no-op if
   * it has already been taken or skipped, so a refresh cannot replay it.
   */
  requestWelcome: () => void;
}

const noop = () => {};

const OnboardingTourContext = createContext<OnboardingTourContextValue>({
  enabled: false,
  startTour: noop,
  requestWelcome: noop,
});

/**
 * Reading this outside a provider returns a disabled, no-op value rather than
 * throwing — the same contract `useOfferingVocabulary` uses, and for the same
 * reason: `UserMenu` and the checklist are shared components that must stay
 * mountable on surfaces that have no tour.
 */
export function useOnboardingTourContext(): OnboardingTourContextValue {
  return useContext(OnboardingTourContext);
}

/**
 * Owns the post-registration tour for one shop.
 *
 * Mounted INSIDE `SidebarProvider` and wrapping both the sidebar and the
 * content, because the tour has to open the sidebar (`useSidebar`) and both
 * `UserMenu` (in the sidebar) and the setup checklist (in the content) start
 * it.
 */
export function OnboardingTourProvider({
  children,
  businessId,
  enabled = false,
  flags = {},
  tourCompleted = false,
}: {
  children: React.ReactNode;
  businessId?: string;
  enabled?: boolean;
  /** The same `app_settings` record the sidebar filters its nav by. */
  flags?: Record<string, boolean>;
  /**
   * `business_settings.onboarding_tour_completed_at != null`, read on the
   * server — so an owner who answered on their phone is not asked again on
   * their laptop.
   */
  tourCompleted?: boolean;
}) {
  const vocabulary = useOfferingVocabulary();

  // Fire-and-forget: the tour has already closed by the time this runs, and a
  // failed write is logged server-side rather than surfaced. Nothing here is
  // worth a toast — the owner did not ask for a save.
  const record = useCallback(() => {
    if (!businessId) return;
    void completeOnboardingTourAction(businessId)
      .then((result) => {
        // A refusal (`FORBIDDEN`, `RATE_LIMITED`) and a failed write both
        // RESOLVE, so `.catch()` alone would drop the only signal that explains
        // why the tour is offered again on the owner's next device.
        if (!result.success || result.data?.recorded === false) {
          console.warn(
            '[OnboardingTour] answer not recorded:',
            result.error?.code ?? 'write failed',
          );
        }
      })
      .catch(() => {});
  }, [businessId]);

  const { phase, invite, start, dismiss, finish, abort } = useOnboardingTour(
    businessId,
    enabled,
    { serverSeen: tourCompleted, onSettle: record },
  );

  // Radix restores focus to the element that OPENED a layer; the tour has no
  // single trigger (menu entry, checklist button, or nothing at all on the
  // welcome arrival), so the element to come back to is recorded here.
  const returnFocus = useRef<HTMLElement | null>(null);
  const wasActive = useRef(false);

  useEffect(() => {
    if (phase !== 'idle') {
      wasActive.current = true;
      return;
    }
    if (!wasActive.current) return;
    wasActive.current = false;

    const target = returnFocus.current;
    returnFocus.current = null;
    // A DETACHED node (a menu item that has since unmounted) and `<body>` are
    // both useless targets — focusing body drops the keyboard user to the top
    // of the document, which is worse than leaving focus where the overlay put
    // it. `<body>` gets recorded whenever `remember()` runs from a mount effect,
    // which is exactly what the welcome arrival does.
    if (!target || !target.isConnected || target === document.body) return;
    target.focus?.();
  }, [phase]);

  const remember = (element?: unknown) => {
    // `instanceof`, not truthiness: `startTour` is handed straight to `onClick`
    // in two places, so the first argument is routinely a click EVENT. Trusting
    // it would store a non-element and quietly lose the focus return.
    if (element instanceof HTMLElement) {
      returnFocus.current = element;
      return;
    }
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    returnFocus.current = active instanceof HTMLElement ? active : null;
  };

  const startTour = useCallback(
    (returnFocusTo?: unknown) => {
      remember(returnFocusTo);
      start();
    },
    [start],
  );

  const requestWelcome = useCallback(() => {
    remember();
    invite();
  }, [invite]);

  const value = useMemo<OnboardingTourContextValue>(
    () => ({
      enabled: enabled && Boolean(businessId),
      startTour,
      requestWelcome,
    }),
    [enabled, businessId, startTour, requestWelcome],
  );

  // Keyed on VALUES, never on object identity. Both `flags` and `vocabulary`
  // are deserialised fresh from the RSC payload on every layout render —
  // including the `router.replace` that consumes the welcome marker — and a new
  // `steps` identity restarts the overlay's settle timer and re-fires
  // `scrollIntoView` mid-step. `resolveTourSteps` reads exactly two vocabulary
  // fields, so those two strings are the whole dependency.
  const bookings = flags.enable_bookings === true;
  const events = flags.enable_events === true;
  const { catalogue, plural } = vocabulary;
  const steps = useMemo(
    () =>
      resolveTourSteps({
        vocabulary,
        flags: { enable_bookings: bookings, enable_events: events },
      }),
    [catalogue, plural, bookings, events],
  );

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}

      {/* An invitation, not an ambush. A spotlight that seizes the page before
          the owner has even looked at it is more intrusive than a card, and
          skipping costs one click either way. */}
      <Dialog
        open={phase === 'invite'}
        onOpenChange={(open) => !open && dismiss()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Want a quick tour?</DialogTitle>
            <DialogDescription>
              Sixty seconds on where everything lives — your{' '}
              {vocabulary.plural.toLowerCase()}, your deals, and the page
              shoppers see. You can replay it any time from your account menu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={dismiss}>
              Not now
            </Button>
            {/* `start`, not `startTour`: there is nothing to record. This
                button unmounts with the dialog, and the welcome arrival has no
                persistent trigger behind it — `remember()` ran from a mount
                effect, when `document.activeElement` was `<body>`. The restore
                effect above rejects both a detached node and `<body>`, so focus
                simply stays where the tour leaves it, which beats throwing the
                keyboard user to the top of the document. */}
            <Button onClick={start}>Take the tour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {phase === 'running' && (
        <TourOverlay
          steps={steps}
          onFinish={finish}
          onSkip={dismiss}
          // Nothing to point at is not an answer: `abort` closes without
          // recording, so the tour is still offered next time.
          onAbort={abort}
        />
      )}
    </OnboardingTourContext.Provider>
  );
}
