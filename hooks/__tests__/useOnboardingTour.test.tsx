// @vitest-environment happy-dom

/**
 * Who gets offered the tour, and when it stops being offered.
 *
 * The two failures that matter: an invitation that survives a refresh (a
 * welcome that never ends), and an invitation dropped because it was requested
 * before the storage read landed — which on a slow paint means a
 * post-registration owner gets no onboarding at all.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOnboardingTour, tourSeenKey } from '../useOnboardingTour';

const BUSINESS_A = '550e8400-e29b-41d4-a716-446655440000';
const BUSINESS_B = '550e8400-e29b-41d4-a716-446655440001';

let api: ReturnType<typeof useOnboardingTour>;
let container: HTMLDivElement;
let root: Root;

/**
 * Asks on mount, exactly as `TourWelcomeTrigger` does — and from a CHILD,
 * because child effects run before the parent's, which is precisely the
 * ordering that lets the request beat the storage read.
 */
function InviteOnMount({ invite }: { invite: () => void }) {
  const asked = React.useRef(false);
  React.useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    invite();
  }, [invite]);
  return null;
}

function Harness({
  businessId,
  enabled = true,
  inviteOnMount = false,
  serverSeen = false,
  onSettle,
}: {
  businessId?: string;
  enabled?: boolean;
  inviteOnMount?: boolean;
  serverSeen?: boolean;
  onSettle?: () => void;
}) {
  api = useOnboardingTour(businessId, enabled, { serverSeen, onSettle });
  return (
    <span>
      {api.phase}
      {inviteOnMount && <InviteOnMount invite={api.invite} />}
    </span>
  );
}

function mount(
  props: {
    businessId?: string;
    enabled?: boolean;
    inviteOnMount?: boolean;
    serverSeen?: boolean;
    onSettle?: () => void;
  } = {},
) {
  act(() => {
    root.render(<Harness businessId={BUSINESS_A} {...props} />);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('useOnboardingTour', () => {
  it('offers the tour to an owner who has not seen it', () => {
    mount();
    expect(api.seen).toBe(false);

    act(() => api.invite());
    expect(api.phase).toBe('invite');
  });

  it('holds an invitation requested before the storage read lands', () => {
    // The dashboard asks on mount, from a child, so the request beats the
    // effect that reads localStorage. Dropping it there is how the one visit we
    // can prove is a fresh registration ends up with no tour at all.
    mount({ inviteOnMount: true });

    expect(api.phase).toBe('invite');
  });

  it('does not resurrect a held request for someone who already saw it', () => {
    window.localStorage.setItem(tourSeenKey(BUSINESS_A), '1');
    mount({ inviteOnMount: true });

    expect(api.phase).toBe('idle');
  });

  it('never re-offers a tour that was taken or skipped', () => {
    window.localStorage.setItem(tourSeenKey(BUSINESS_A), '1');
    mount();

    expect(api.seen).toBe(true);
    act(() => api.invite());
    expect(api.phase).toBe('idle');
  });

  it('still replays on demand after it has been seen', () => {
    window.localStorage.setItem(tourSeenKey(BUSINESS_A), '1');
    mount();

    act(() => api.start());
    expect(api.phase).toBe('running');
  });

  it('treats skipping and finishing alike: both end the invitation', () => {
    mount();
    act(() => api.start());
    act(() => api.dismiss());

    expect(api.phase).toBe('idle');
    expect(window.localStorage.getItem(tourSeenKey(BUSINESS_A))).toBe('1');

    act(() => api.invite());
    expect(api.phase).toBe('idle');
  });

  it('is keyed per business, so a second shop onboards on its own', () => {
    window.localStorage.setItem(tourSeenKey(BUSINESS_A), '1');
    mount({ businessId: BUSINESS_B });

    expect(api.seen).toBe(false);
    act(() => api.invite());
    expect(api.phase).toBe('invite');
  });

  it('does nothing at all while the kill switch is off', () => {
    mount({ enabled: false });

    act(() => api.invite());
    expect(api.phase).toBe('idle');
    act(() => api.start());
    expect(api.phase).toBe('idle');
  });

  it('settles on the server’s answer with no null phase in between', () => {
    // An owner who took the tour on another device has nothing in THIS
    // browser's storage; seeding from the server keeps the invitation from
    // flickering while localStorage is consulted.
    mount({ serverSeen: true, inviteOnMount: true });

    expect(api.seen).toBe(true);
    expect(api.phase).toBe('idle');
  });

  it('records the answer once, not on every replay', () => {
    const onSettle = vi.fn();
    mount({ onSettle });

    act(() => api.start());
    act(() => api.dismiss());
    expect(onSettle).toHaveBeenCalledTimes(1);

    act(() => api.start());
    act(() => api.finish());
    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it('does not re-post an answer the server already holds', () => {
    const onSettle = vi.fn();
    mount({ serverSeen: true, onSettle });

    act(() => api.start());
    act(() => api.finish());

    expect(onSettle).not.toHaveBeenCalled();
  });

  it('treats unusable storage as already seen rather than asking forever', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });

    mount();
    expect(api.seen).toBe(true);
    act(() => api.invite());
    expect(api.phase).toBe('idle');
  });

  it('still ends the visit’s tour when storage refuses the write', () => {
    const setItem = vi
      .spyOn(window.localStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota');
      });

    mount();
    act(() => api.start());
    act(() => api.finish());

    expect(setItem).toHaveBeenCalled();
    expect(api.phase).toBe('idle');
    // In-memory `seen` still ends this visit, so a failed write cannot leave
    // the invitation looping on the same page.
    expect(api.seen).toBe(true);
  });
});
