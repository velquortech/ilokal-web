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
  /** Start the tour outright — the two replay entries. */
  startTour: () => void;
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
    void completeOnboardingTourAction(businessId).catch(() => {});
  }, [businessId]);

  const { phase, invite, start, dismiss, finish } = useOnboardingTour(
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
    returnFocus.current?.focus?.();
    returnFocus.current = null;
  }, [phase]);

  const remember = () => {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    returnFocus.current = active instanceof HTMLElement ? active : null;
  };

  const startTour = useCallback(() => {
    remember();
    start();
  }, [start]);

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

  // Copy and flag filtering resolve once per render of the shell, not per step.
  const steps = useMemo(
    () => resolveTourSteps({ vocabulary, flags }),
    [vocabulary, flags],
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
            <Button onClick={start}>Take the tour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {phase === 'running' && (
        <TourOverlay steps={steps} onFinish={finish} onSkip={dismiss} />
      )}
    </OnboardingTourContext.Provider>
  );
}
