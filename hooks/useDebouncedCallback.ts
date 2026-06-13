import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a stable debounced version of `callback`. The returned function can be
 * called on every event (e.g. each keystroke); the underlying `callback` only
 * runs `delay` ms after the last call.
 *
 * The debounced function identity is stable across renders, and the latest
 * `callback` is always invoked (so closing over fresh props/state works without
 * re-creating the debouncer). Pending timers are cleared on unmount.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay = 400,
): (...args: A) => void {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always point at the latest callback without changing the debounced identity.
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Clear any pending timer when the component unmounts.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );
}
