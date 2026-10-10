/* global self, caches, fetch, URL, Response */
/*
 * iLokal service worker.
 *
 * Its ONLY job is to make the installed app survive a bad connection and load
 * its static shell fast. It deliberately caches almost nothing.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 🔴 WHY THIS FILE IS MOSTLY A LIST OF THINGS IT REFUSES TO DO
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Every dashboard page in this app is `dynamic = 'force-dynamic'`,
 * cookie-scoped and RLS-scoped. A cached `/business/<id>` document — or its
 * RSC payload, or any `/api/**` response — is one account's data sitting in a
 * shared browser profile:
 *
 *   · served to the next person to use the phone, and
 *   · served to the SAME person after they sign out, showing a dashboard the
 *     session no longer has.
 *
 * There is no cache header, no `Vary`, and no expiry that makes that safe,
 * because the identity is in a cookie the Cache API does not key on. So the
 * rule is not "cache carefully" — it is **never call `respondWith` for
 * anything that could be user-specific**. A request the worker does not
 * respond to goes to the network exactly as if this file did not exist.
 *
 * The second refusal is method. Every mutation in both dashboards is a Server
 * Action, i.e. a POST. Touching a POST — even to "pass it through" — risks a
 * consumed body and breaks writes in the worst possible way: only once the app
 * is installed, i.e. after the user has committed to it.
 *
 * Both refusals are pinned by `__test__/config/pwa.contract.test.ts`, which
 * reads THIS FILE and fails if the guards move or weaken.
 */

/**
 * Bump on any change to what is precached or how it is served.
 *
 * The browser byte-compares this file on navigation and treats any difference
 * as a new worker, so the constant does not have to be a build id — it exists
 * so `activate` can delete what the previous version left behind. The
 * `Cache-Control: no-store` header on `/sw.js` (see `next.config.ts`) is what
 * makes that comparison happen promptly; without it a worker update can be up
 * to 24 hours late.
 */
const CACHE_VERSION = 'ilokal-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

/** Shown when a navigation cannot reach the network at all. */
const OFFLINE_URL = '/offline';

/**
 * Precached at install: the offline page and the icons it needs. Nothing else
 * — the build output is content-hashed and picked up at runtime instead, so
 * this list cannot go stale against a deploy.
 */
const PRECACHE = [OFFLINE_URL, '/brand/icon/app-icon-192.png'];

/**
 * Path prefixes that are NEVER responded to, whatever else matches.
 *
 * `/api` and `/monitoring` are data and the Sentry tunnel. The three app
 * prefixes are the authenticated surfaces, and they are listed even though the
 * rules below would already skip them: a static-looking asset served from
 * under one of these must not become the exception that reintroduces the whole
 * problem. Kept in lockstep with `lib/utils/protectedRoutes.ts` by the
 * contract test.
 */
const NEVER_HANDLE = [
  '/api',
  '/admin',
  '/business',
  '/customer',
  '/monitoring',
];

/**
 * Safe to cache: content-hashed build output and static brand assets. Both are
 * immutable and identical for every visitor — there is no session in them.
 */
const STATIC_PREFIXES = ['/_next/static/', '/brand/', '/leaflet/', '/images/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // A failed precache must not block installation — the worker is still
      // useful for the static-asset path, and the offline page simply falls
      // back to the browser's own error page.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      // Take over open tabs immediately. Without this a user keeps the
      // previous worker until every tab is closed, which on a home-screen app
      // can be days.
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // ── Refusal 1: method. Server Actions are POSTs. ───────────────────────
  if (request.method !== 'GET') return;

  // ── Refusal 2: origin. Nothing third-party is ours to cache. ───────────
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ── Refusal 3: authenticated and data surfaces. ────────────────────────
  if (
    NEVER_HANDLE.some(
      (prefix) =>
        url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    )
  ) {
    return;
  }

  // ── Refusal 4: anything React asks for as data. ────────────────────────
  // An RSC payload is the rendered page, cookie-scoped exactly like the
  // document. These arrive as ordinary same-origin GETs, so without this they
  // would look like any other request.
  if (
    request.headers.get('RSC') ||
    request.headers.get('Next-Router-Prefetch') ||
    request.headers.get('Next-Router-State-Tree') ||
    url.searchParams.has('_rsc')
  ) {
    return;
  }

  // ── Navigations: network only, with an offline fallback. ───────────────
  // Never cached — the fallback is a static page with no user data in it.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then(
            (cached) =>
              cached ??
              new Response('', { status: 503, statusText: 'Offline' }),
          ),
      ),
    );
    return;
  }

  // ── Static assets: cache-first. ────────────────────────────────────────
  if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Only a complete, same-origin 200 is worth keeping. An opaque or
          // partial response cached here would be indistinguishable from a
          // real one on the next load.
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      }),
    );
    return;
  }

  // Everything else: not ours. The request goes to the network untouched.
});
