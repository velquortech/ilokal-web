'use client';

import { useEffect } from 'react';

/**
 * Registers `public/sw.js`.
 *
 * Renders nothing — it exists because service-worker registration has to
 * happen from the browser, and this app's root layout is a server component.
 *
 * **Production only.** In development the app is rebuilt constantly and a
 * worker holding an old static cache turns every stale asset into a
 * "why is this not updating" hunt. `next dev` also serves `/_next/static/`
 * paths that are not immutable, which is the one assumption the worker's
 * cache-first branch makes.
 *
 * Failure is silent by design: a browser with service workers disabled, a
 * private window, or an insecure origin should get the app exactly as it is
 * today, not an error.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // After load, so registration never competes with the first paint for
    // bandwidth on the connection it is meant to help.
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
          /**
           * 🔴 `updateViaCache: 'none'` is what actually guarantees the update
           * check sees a fresh script — NOT the `Cache-Control: no-store` in
           * `next.config.ts`.
           *
           * Verified live against the dev server: that header block DOES apply
           * (`Service-Worker-Allowed` and `Content-Type` both arrive), but
           * Next's static handler for `public/` overrides `Cache-Control` with
           * its own `public, max-age=0`. So the header alone could not be
           * relied on, and a contract test asserting only the config would
           * have passed while the served response said something else.
           *
           * This option is enforced by the browser, so it holds whatever the
           * server sends: the worker script and its imports are always fetched
           * bypassing the HTTP cache.
           */
          updateViaCache: 'none',
        })
        .catch(() => {
          // Nothing to do and nothing worth reporting: the app works without it.
        });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
