'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingTourContext } from './OnboardingTourProvider';

/**
 * Owns both one-shot jobs of the post-registration arrival: offering the tour,
 * and consuming the `?welcome=1` marker.
 *
 * `welcome` is read on the SERVER from `searchParams` and handed down, so this
 * does not depend on winning a race with anything. Rendering nothing keeps it
 * independent of whether the checklist is visible — and that independence is
 * the point: the card is absent whenever the checklist has been dismissed, so
 * a strip that lived inside it left the marker in the URL and in history on
 * exactly that path, and a back-navigation replayed the invitation.
 */
export function TourWelcomeTrigger({
  welcome,
  cleanUrl,
}: {
  welcome: boolean;
  /** Same URL with `?welcome` removed; every other param preserved. */
  cleanUrl?: string;
}) {
  const router = useRouter();
  const { requestWelcome } = useOnboardingTourContext();
  // Both jobs are one-shot, and both are guarded by a ref rather than by their
  // deps. StrictMode mounts effects twice in dev, and `useRouter()`'s identity
  // is not something to bet a repeated `replace` on — asking twice would also
  // re-record the focus-return element.
  const asked = useRef(false);
  const stripped = useRef(false);

  useEffect(() => {
    if (!welcome || asked.current) return;
    asked.current = true;
    requestWelcome();
  }, [welcome, requestWelcome]);

  // Strip the marker so a refresh, a bookmark or a shared link cannot replay
  // the welcome. The state it drives was already snapshotted by the consumers.
  useEffect(() => {
    if (!welcome || !cleanUrl || stripped.current) return;
    stripped.current = true;
    router.replace(cleanUrl, { scroll: false });
  }, [welcome, cleanUrl, router]);

  return null;
}
