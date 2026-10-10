/**
 * PWA contract sweep.
 *
 * Two of these assertions guard a data-exposure bug, not a layout one, and
 * that is why this file exists rather than a comment in `public/sw.js`:
 *
 *  · **A cached authenticated response is a leak.** Every dashboard page is
 *    `force-dynamic`, cookie-scoped and RLS-scoped. A cached `/business/<id>`
 *    document, its RSC payload, or any `/api/**` response is one account's
 *    data sitting in a shared browser profile — served to the next person to
 *    pick up the phone, and to the same person after they sign out. There is
 *    no cache header that makes it safe, because the identity is in a cookie
 *    the Cache API does not key on.
 *  · **A POST the worker touches is a broken write.** Every mutation in both
 *    dashboards is a Server Action. This one only reproduces once the app is
 *    installed, i.e. after the user has committed to it.
 *
 * Both are one deleted line away at all times, and neither fails visibly.
 *
 * Source-level assertions, in the shape `dialog.contract.test.ts` and
 * `table-toolbar.contract.test.ts` already use: the invariant is the shape of
 * the guard, so reading the file is equivalent to running it — and a real
 * service-worker environment does not exist under happy-dom anyway.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

/**
 * `sw.js` names every prefix it refuses IN PROSE, above the code that refuses
 * it. A sweep that ran before stripping would pass on the explanation — and
 * would keep passing after someone deleted the code and left the comment.
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const sw = () => stripComments(read('public/sw.js'));

describe('the service worker refuses everything it must', () => {
  it('bails on any non-GET before it can call respondWith', () => {
    const source = sw();
    const fetchHandler = source.slice(
      source.indexOf("addEventListener('fetch'"),
    );

    const methodGuard = fetchHandler.indexOf("request.method !== 'GET'");
    const firstRespond = fetchHandler.indexOf('respondWith');

    expect(methodGuard, 'no method guard in the fetch handler').toBeGreaterThan(
      -1,
    );
    expect(firstRespond).toBeGreaterThan(-1);
    // Position, not presence: a guard AFTER the first respondWith guards
    // nothing, and reads identically at a glance.
    expect(methodGuard).toBeLessThan(firstRespond);
  });

  it('bails on cross-origin requests before responding', () => {
    const source = sw();
    const handler = source.slice(source.indexOf("addEventListener('fetch'"));
    const originGuard = handler.indexOf('url.origin !== self.location.origin');
    expect(originGuard).toBeGreaterThan(-1);
    expect(originGuard).toBeLessThan(handler.indexOf('respondWith'));
  });

  it('never handles an authenticated or data path', () => {
    const source = sw();
    // Kept in lockstep with the app's own protected prefixes. Adding a
    // protected prefix to the app without adding it here is exactly the edit
    // this assertion exists to fail on.
    for (const prefix of [
      '/api',
      '/admin',
      '/business',
      '/customer',
      '/monitoring',
    ]) {
      expect(source, `${prefix} is not in NEVER_HANDLE`).toContain(
        `'${prefix}'`,
      );
    }

    const handler = source.slice(source.indexOf("addEventListener('fetch'"));
    const denyGuard = handler.indexOf('NEVER_HANDLE');
    expect(denyGuard).toBeGreaterThan(-1);
    expect(denyGuard).toBeLessThan(handler.indexOf('respondWith'));
  });

  it('never handles an RSC payload', () => {
    const source = sw();
    // The rendered page as data, cookie-scoped exactly like the document, and
    // arriving as an ordinary same-origin GET — so it looks like any other
    // request unless it is checked for by name.
    expect(source).toContain("headers.get('RSC')");
    expect(source).toContain("searchParams.has('_rsc')");
  });

  it('caches only immutable, session-free paths', () => {
    const source = sw();
    const list = source.match(/const STATIC_PREFIXES = \[([^\]]*)\]/)?.[1];
    expect(list, 'STATIC_PREFIXES not found').toBeTruthy();

    const prefixes = [...(list ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(prefixes.length).toBeGreaterThan(0);
    for (const prefix of prefixes) {
      // Content-hashed build output and static brand assets only. Anything
      // that can vary per session must never reach the cache-first branch.
      expect(
        ['/_next/static/', '/brand/', '/leaflet/', '/images/'],
        `${prefix} is not a known-immutable prefix`,
      ).toContain(prefix);
    }
  });

  it('stores only complete same-origin responses', () => {
    const source = sw();
    // An opaque or partial response cached here is indistinguishable from a
    // real one on the next load, and serves as a broken asset forever.
    expect(source).toContain('response.ok');
    expect(source).toContain("response.type === 'basic'");
  });

  it('claims open clients and drops superseded caches on activate', () => {
    const source = sw();
    expect(source).toContain('skipWaiting');
    expect(source).toContain('clients.claim');
    expect(source).toContain('caches.delete');
  });
});

describe('the manifest can actually be installed from', () => {
  const manifest = read('app/manifest.ts');
  const nextConfig = read('next.config.ts');

  it('does not start on a path the app redirects away from', () => {
    const startUrl = manifest.match(/const START_URL = '([^']+)'/)?.[1];
    expect(startUrl, 'START_URL not found').toBeTruthy();
    expect(startUrl).not.toBe('/');

    // `/` is a `permanent: true` redirect — a 308, which browsers cache hard.
    // A start_url pointing at any redirect source means a stutter on every
    // cold launch of the installed app.
    const sources = [...nextConfig.matchAll(/source: '([^']+)'/g)].map(
      (m) => m[1],
    );
    expect(sources).toContain('/');
    expect(sources).not.toContain(startUrl);
  });

  it('ships exactly one maskable icon, and it is its own file', () => {
    const icons = [
      ...manifest.matchAll(
        /src: '([^']+)',\s*sizes: '([^']+)',[\s\S]*?purpose: '([^']+)'/g,
      ),
    ].map((m) => ({ src: m[1], sizes: m[2], purpose: m[3] }));

    const maskable = icons.filter((i) => i.purpose === 'maskable');
    const any = icons.filter((i) => i.purpose === 'any');

    expect(maskable).toHaveLength(1);
    expect(any.length).toBeGreaterThan(0);
    // One file declared as both is masked in the launcher AND used unmasked in
    // the install dialog, so it is padded where it should be full-bleed.
    for (const a of any) {
      expect(a.src).not.toBe(maskable[0].src);
    }
  });

  it('declares the icon files it points at, and they exist', () => {
    const srcs = [...manifest.matchAll(/src: '(\/[^']+)'/g)].map((m) => m[1]);
    expect(srcs.length).toBeGreaterThanOrEqual(3);
    for (const src of srcs) {
      expect(
        () => read(join('public', src)),
        `${src} is missing`,
      ).not.toThrow();
    }
  });

  it('does not lock orientation', () => {
    // The one surface people rotate for is the dashboard tables.
    expect(stripComments(manifest)).not.toContain('orientation');
  });
});

describe('the worker script is never cached by the browser', () => {
  const nextConfig = read('next.config.ts');
  const registrar = read('components/custom/pwa/ServiceWorkerRegistrar.tsx');

  /**
   * 🔴 This asserts the REGISTRATION option, not the header, and the reason is
   * worth keeping.
   *
   * The first version of this test asserted only that `next.config.ts` declared
   * `Cache-Control: no-store` for `/sw.js`. It passed. A live fetch of the
   * running server then returned `Cache-Control: public, max-age=0` — Next's
   * static handler for `public/` overrides that key, while the same header
   * block's `Service-Worker-Allowed` and `Content-Type` DO arrive. So the
   * config said one thing and the response said another, and the test was
   * guarding the declaration rather than the behaviour.
   *
   * `updateViaCache: 'none'` is enforced by the browser and holds whatever the
   * server sends.
   */
  it('registers with updateViaCache none', () => {
    expect(registrar).toContain("updateViaCache: 'none'");
  });

  it('still declares the header, as defence in depth', () => {
    const block = nextConfig.slice(
      nextConfig.indexOf("source: '/sw.js'"),
      nextConfig.indexOf("source: '/:path*'"),
    );
    expect(
      block,
      '/sw.js header block not found before the catch-all',
    ).toContain('no-store');
    expect(block).toContain('Cache-Control');
  });
});

describe('iOS gets the tag Apple actually documents', () => {
  const layout = read('app/layout.tsx');

  /**
   * Next 16 renders `appleWebApp.capable` as `mobile-web-app-capable` and does
   * NOT emit the `apple-` prefixed name — observed in the served `<head>`, not
   * assumed from the docs. Apple's own guidance still names
   * `apple-mobile-web-app-capable`, so relying on the alias is a bet on Safari
   * honouring a tag Apple never documented; without it, Add to Home Screen can
   * produce a Safari bookmark with full chrome instead of a standalone window.
   */
  it('emits apple-mobile-web-app-capable explicitly', () => {
    expect(layout).toContain("'apple-mobile-web-app-capable': 'yes'");
  });
});

describe('registration is deliberate, not automatic', () => {
  const registrar = read('components/custom/pwa/ServiceWorkerRegistrar.tsx');

  it('only registers in production', () => {
    // `next dev` serves mutable `/_next/static/` paths, which is the single
    // assumption the worker's cache-first branch makes.
    expect(registrar).toContain("process.env.NODE_ENV !== 'production'");
  });

  it('degrades silently where service workers are unavailable', () => {
    expect(registrar).toContain("'serviceWorker' in navigator");
    expect(registrar).toContain('.catch(');
  });
});
