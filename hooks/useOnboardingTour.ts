'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Per business, and on its OWN key.
 *
 * `useDashboardTour`/`hasSeenShopTour` belongs to the pre-registration dialog —
 * a different audience, a different CTA (it sends you into the wizard), and a
 * device-wide key. Widening it would let this tour's dismissal silence that
 * one, and vice versa. It is left untouched.
 *
 * Since phase 3 the authoritative marker is
 * `business_settings.onboarding_tour_completed_at`, passed in as `serverSeen`.
 * This key survives as a LOCAL ECHO: it keeps the device quiet when the server
 * write fails, and it answers before the first server read on any surface that
 * has none. It can only ever say "seen" — it cannot un-see what the server
 * recorded.
 */
export const tourSeenKey = (businessId: string) =>
  `ilokal-onboarding-tour:${businessId}`;

export type TourPhase = 'idle' | 'invite' | 'running';

interface UseOnboardingTourReturn {
  phase: TourPhase;
  /** `null` until the mount read lands — never assume "unseen" during SSR. */
  seen: boolean | null;
  /** Offer the tour. No-op once it has been taken or skipped. */
  invite: () => void;
  /** Start it outright (the replay entries). Ignores `seen` by design. */
  start: () => void;
  /** Declined the invitation, or skipped mid-tour: both mean "don't ask again". */
  dismiss: () => void;
  /** Reached the last step. */
  finish: () => void;
  /**
   * Close WITHOUT recording an answer.
   *
   * For the case where the tour cannot run — no anchor on this layout measures,
   * so there is nothing to show. Recording that as "answered" would silence the
   * tour forever on the strength of a visit where the owner saw nothing at all.
   */
  abort: () => void;
}

const read = (key: string): boolean => {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    // Private mode / storage disabled. Treat as seen: re-offering the tour on
    // every single page load forever is a worse failure than never offering it.
    return true;
  }
};

const write = (key: string) => {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Nothing to do — the in-memory `seen` below still ends this visit's tour.
  }
};

export interface UseOnboardingTourOptions {
  /**
   * `business_settings.onboarding_tour_completed_at != null`, read on the
   * server. `true` settles `seen` immediately — no null phase, no invitation
   * flashing before the answer arrives.
   */
  serverSeen?: boolean;
  /** Record the answer server-side. Called once, on the first settle. */
  onSettle?: () => void;
}

export function useOnboardingTour(
  businessId?: string,
  enabled = true,
  { serverSeen = false, onSettle }: UseOnboardingTourOptions = {},
): UseOnboardingTourReturn {
  const [phase, setPhase] = useState<TourPhase>('idle');
  // The server's answer is authoritative and already known at first render, so
  // an owner who took the tour on another device never sees the invitation
  // flicker while localStorage is consulted.
  const [seen, setSeen] = useState<boolean | null>(serverSeen ? true : null);

  // The invite can be requested before the storage read lands (the dashboard
  // asks on mount). Hold the request rather than dropping it — dropping it is
  // how a post-registration owner gets no onboarding at all on a slow paint.
  const requested = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !businessId) return;
    if (serverSeen) return;
    // The echo can only add a "seen" — it never contradicts the server.
    setSeen(read(tourSeenKey(businessId)));
  }, [businessId, serverSeen]);

  useEffect(() => {
    if (seen === null || !requested.current) return;
    requested.current = false;
    if (seen || !enabled) return;
    setPhase((current) => (current === 'idle' ? 'invite' : current));
  }, [seen, enabled]);

  const invite = useCallback(() => {
    if (!enabled) return;
    if (seen === null) {
      requested.current = true;
      return;
    }
    if (seen) return;
    setPhase((current) => (current === 'idle' ? 'invite' : current));
  }, [enabled, seen]);

  const start = useCallback(() => {
    if (!enabled) return;
    setPhase('running');
  }, [enabled]);

  // Recorded once. Skipping and finishing both settle, and a replayed tour
  // settles again — but the server already holds the answer, so re-posting it
  // is noise against a rate-limited endpoint.
  const recorded = useRef(serverSeen);

  const settle = useCallback(() => {
    setPhase('idle');
    setSeen(true);
    if (businessId) write(tourSeenKey(businessId));
    if (!recorded.current) {
      recorded.current = true;
      onSettle?.();
    }
  }, [businessId, onSettle]);

  const abort = useCallback(() => setPhase('idle'), []);

  return {
    phase,
    seen,
    invite,
    start,
    // Skipping and finishing differ only in what the user did; both must stop
    // the invitation returning on the next refresh.
    dismiss: settle,
    finish: settle,
    abort,
  };
}
