'use client';

import { useEffect, useRef } from 'react';
import { useOnboardingTourContext } from './OnboardingTourProvider';

/**
 * Offers the tour on the post-registration arrival, and only there.
 *
 * `welcome` is read on the SERVER from `searchParams` and handed down, so this
 * does not depend on winning a race with `SetupChecklist`'s `router.replace`,
 * which strips the marker a tick after mount. Rendering nothing keeps it
 * independent of whether the checklist itself is visible — a dismissed or
 * already-complete checklist must not silently cancel the tour.
 */
export function TourWelcomeTrigger({ welcome }: { welcome: boolean }) {
  const { requestWelcome } = useOnboardingTourContext();
  // StrictMode mounts effects twice in dev; the invitation is idempotent, but
  // asking twice would also re-record the focus-return element.
  const asked = useRef(false);

  useEffect(() => {
    if (!welcome || asked.current) return;
    asked.current = true;
    requestWelcome();
  }, [welcome, requestWelcome]);

  return null;
}
