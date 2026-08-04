// @vitest-environment happy-dom

/**
 * The invitation, and the kill switch.
 *
 * The tour is offered — not sprung. A spotlight that seizes the page before the
 * owner has looked at it is more intrusive than a card, and skipping costs one
 * click either way. What must hold: the invitation appears only on the arrival
 * we can prove is a fresh registration, it never returns after being answered,
 * and with the switch off nothing mounts and no entry point advertises it.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OnboardingTourProvider,
  useOnboardingTourContext,
} from '../OnboardingTourProvider';
import { TourWelcomeTrigger } from '../TourWelcomeTrigger';
import { tourSeenKey } from '@/hooks/useOnboardingTour';

const sidebar = {
  isMobile: false,
  open: false,
  setOpen: vi.fn(),
  openMobile: false,
  setOpenMobile: vi.fn(),
  state: 'collapsed' as const,
  toggleSidebar: vi.fn(),
};

vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: () => sidebar,
}));

const completeAction = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/app/actions/onboardingActions', () => ({
  completeOnboardingTourAction: (id: string) => completeAction(id),
  dismissOnboardingChecklistAction: vi.fn().mockResolvedValue({
    success: true,
  }),
}));

const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

let container: HTMLDivElement;
let root: Root;

/** Stands in for the checklist's and the user menu's replay entries. */
function ReplayEntry() {
  const { enabled, startTour } = useOnboardingTourContext();
  if (!enabled) return null;
  return (
    <button type="button" onClick={startTour}>
      Take the tour
    </button>
  );
}

function paintAnchor(id: string) {
  const el = document.createElement('div');
  el.setAttribute('data-tour', id);
  document.body.appendChild(el);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const painted = this === el;
      const size = painted ? 40 : 0;
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: size,
        bottom: size,
        width: size,
        height: size,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );
}

function render(ui: React.ReactElement) {
  act(() => {
    root.render(ui);
  });
}

const text = () => document.body.textContent ?? '';

const button = (label: string) =>
  Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  );

beforeEach(() => {
  vi.useFakeTimers();
  completeAction.mockClear();
  window.localStorage.clear();
  sidebar.setOpen = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('OnboardingTourProvider', () => {
  it('offers the tour on the post-registration arrival', () => {
    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled>
        <TourWelcomeTrigger welcome />
      </OnboardingTourProvider>,
    );

    expect(text()).toContain('Want a quick tour?');
    expect(button('Take the tour')).toBeDefined();
  });

  it('says nothing on any other visit', () => {
    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled>
        <TourWelcomeTrigger welcome={false} />
      </OnboardingTourProvider>,
    );

    expect(text()).not.toContain('Want a quick tour?');
  });

  it('does not ask again once the invitation has been answered', () => {
    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled>
        <TourWelcomeTrigger welcome />
      </OnboardingTourProvider>,
    );

    act(() => button('Not now')?.click());
    expect(text()).not.toContain('Want a quick tour?');
    // Persisted, so a refresh — which arrives with the marker already stripped
    // — cannot replay it either.
    expect(window.localStorage.getItem(tourSeenKey(BUSINESS_ID))).toBe('1');

    act(() => root.unmount());
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled>
        <TourWelcomeTrigger welcome />
      </OnboardingTourProvider>,
    );
    expect(text()).not.toContain('Want a quick tour?');
  });

  it('runs the spotlight once the invitation is accepted', () => {
    paintAnchor('setup-checklist');

    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled>
        <TourWelcomeTrigger welcome />
      </OnboardingTourProvider>,
    );

    act(() => button('Take the tour')?.click());
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(text()).toContain('Your setup checklist');
    expect(text()).toContain('Step 1 of 1');
  });

  it('replays on demand, even for an owner who already answered', () => {
    window.localStorage.setItem(tourSeenKey(BUSINESS_ID), '1');
    paintAnchor('setup-checklist');

    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled>
        <ReplayEntry />
      </OnboardingTourProvider>,
    );

    expect(text()).not.toContain('Want a quick tour?');
    act(() => button('Take the tour')?.click());
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(text()).toContain('Step 1 of 1');
  });

  it('mounts nothing and advertises nothing while the switch is off', () => {
    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled={false}>
        <TourWelcomeTrigger welcome />
        <ReplayEntry />
      </OnboardingTourProvider>,
    );

    expect(text()).not.toContain('Want a quick tour?');
    // No dead menu entry: the replay control is absent, not disabled.
    expect(button('Take the tour')).toBeUndefined();
  });

  it('stays disabled for a shop that does not exist yet', () => {
    // The pre-registration screen has no id to key progress or dismissal on.
    render(
      <OnboardingTourProvider enabled>
        <ReplayEntry />
      </OnboardingTourProvider>,
    );

    expect(button('Take the tour')).toBeUndefined();
  });

  it('records the answer server-side, once', () => {
    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled>
        <TourWelcomeTrigger welcome />
        <ReplayEntry />
      </OnboardingTourProvider>,
    );

    act(() => button('Not now')?.click());
    expect(completeAction).toHaveBeenCalledWith(BUSINESS_ID);

    // A replay settles again, but the server already holds the answer — and
    // this is a rate-limited endpoint, not a heartbeat.
    completeAction.mockClear();
    act(() => button('Take the tour')?.click());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => button('Skip')?.click());
    expect(completeAction).not.toHaveBeenCalled();
  });

  it('does not consume the tour when there was nothing to show', () => {
    // No `paintAnchor` here: every element measures 0x0, so the overlay has
    // nothing to point at. That must not count as an answer — otherwise one
    // click on a layout where no anchor renders silences the tour for good.
    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled>
        <ReplayEntry />
      </OnboardingTourProvider>,
    );

    act(() => button('Take the tour')?.click());
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(completeAction).not.toHaveBeenCalled();
    expect(
      window.localStorage.getItem(`ilokal-onboarding-tour:${BUSINESS_ID}`),
    ).toBe(null);
    // ...and the entry point is still there to try again.
    expect(button('Take the tour')).toBeDefined();
  });

  it('does not ask an owner who answered on another device', () => {
    // Nothing in this browser's storage — the stored answer travels with the
    // shop, which is the whole point of moving it off localStorage.
    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled tourCompleted>
        <TourWelcomeTrigger welcome />
      </OnboardingTourProvider>,
    );

    expect(text()).not.toContain('Want a quick tour?');
    // ...and nothing is re-posted for an answer the server already has.
    expect(completeAction).not.toHaveBeenCalled();
  });

  it('gives focus back to whatever started the tour', () => {
    paintAnchor('setup-checklist');

    render(
      <OnboardingTourProvider businessId={BUSINESS_ID} enabled>
        <ReplayEntry />
      </OnboardingTourProvider>,
    );

    const trigger = button('Take the tour')!;
    trigger.focus();
    act(() => trigger.click());
    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => button('Skip')?.click());
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(document.activeElement).toBe(trigger);
  });
});
