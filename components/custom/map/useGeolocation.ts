'use client';

/**
 * "Use my location", once.
 *
 * This was duplicated verbatim in the registration wizard and in branch
 * creation — the same twenty lines, the same copy, the same `toFixed(6)`,
 * differing only in which two form fields they wrote. The event form would
 * have been the third.
 *
 * The caller decides what to do with the pair, so this stays free of any form
 * library: `onLocated` is called with the two numbers and nothing else.
 */

import * as React from 'react';

interface UseGeolocationResult {
  detect: () => void;
  isDetecting: boolean;
  /** Null until something goes wrong; hand-written copy, never the raw error. */
  error: string | null;
  /**
   * Drop the message.
   *
   * It reads "click the map or enter coordinates manually" — so once they
   * have, it is describing something already done. A denied permission prompt
   * cannot be re-asked from here, so nothing else will clear it.
   */
  clearError: () => void;
}

/**
 * Coordinates are stored at six decimal places everywhere in this app —
 * roughly 0.1 m, far finer than a phone's fix, and enough that a pin
 * round-trips through the DB unchanged.
 */
const PRECISION = 6;

export function useGeolocation(
  onLocated: (latitude: number, longitude: number) => void,
): UseGeolocationResult {
  const [isDetecting, setIsDetecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // The browser calls back whenever it feels like it, and the caller's handler
  // usually closes over form state — a ref keeps the callback current without
  // making `detect` a new function on every render.
  const handler = React.useRef(onLocated);
  React.useEffect(() => {
    handler.current = onLocated;
  }, [onLocated]);

  const detect = React.useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetecting(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handler.current(
          parseFloat(position.coords.latitude.toFixed(PRECISION)),
          parseFloat(position.coords.longitude.toFixed(PRECISION)),
        );
        setIsDetecting(false);
      },
      () => {
        // Names the two ways out, because a denied permission prompt cannot be
        // re-asked from here — the user has to change a browser setting, or
        // use one of these instead.
        setError(
          'Unable to detect location. Click the map or enter coordinates manually.',
        );
        setIsDetecting(false);
      },
    );
  }, []);

  const clearError = React.useCallback(() => setError(null), []);

  return { detect, isDetecting, error, clearError };
}
