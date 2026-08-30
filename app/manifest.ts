import type { MetadataRoute } from 'next';

/**
 * The web app manifest — what makes iLokal installable to a phone home screen.
 *
 * A Next file convention, so this serves `/manifest.webmanifest` AND emits the
 * `<link rel="manifest">` itself. A hand-written `public/manifest.json` would
 * have needed its own `<link>` in the root layout, would not be typed, and
 * would be one more place the brand colours are spelled out.
 *
 * CSP needs no change: `manifest-src` is unset, so it falls back to
 * `default-src 'self'`, and this is same-origin.
 */

/**
 * 🔴 NOT `/`.
 *
 * `next.config.ts` redirects `/` to `NEXT_PUBLIC_DESTINATION` with
 * `permanent: true` — a 308, which browsers cache hard. A PWA whose
 * `start_url` is `/` therefore eats a redirect on every cold launch, and if
 * that env var is ever empty the redirect target is the empty string. Naming
 * the destination directly costs nothing and cannot rot in that direction.
 *
 * It is also deliberately NOT a dashboard path. A manifest has exactly one
 * start URL and this app has three homes — `/admin/<id>`, `/business/<id>` and
 * `/explore` — two of which carry an id in the path that a static manifest
 * cannot know. `/home` is the one entry every role can take: the session is
 * resolved there and `redirectByRole` sends each user on, which is the same
 * path `/business` and `/admin` already take as resolvers.
 */
const START_URL = '/home';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'iLokal — discover through experience',
    short_name: 'iLokal',
    description:
      'Find and support nearby cafés, restaurants, boutiques, and other homegrown brands — and run your own shop from the same app.',
    start_url: START_URL,
    // Everything, so an installed window keeps both dashboards and the public
    // surface in scope. Scope is NOT the safety mechanism for authenticated
    // routes — `public/sw.js` declines to cache them, and that is where the
    // rule lives, because scope cannot express "in scope but never cached".
    scope: '/',
    display: 'standalone',
    // Deliberately NOT `fullscreen`: that hides the status bar, and an owner
    // checking their shop wants the clock and the battery.
    //
    // Orientation is deliberately UNSET. Locking to portrait would be wrong on
    // the one surface people actually rotate for — the dashboard tables.
    background_color: '#FBFAF6', // Porcelain
    theme_color: '#D70005', // Brick Ember
    lang: 'en-PH',
    dir: 'ltr',
    categories: ['business', 'food', 'shopping'],
    icons: [
      {
        src: '/brand/icon/app-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/icon/app-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // A SEPARATE file from the `any` cuts, never the same one declared as
        // both. Android masks a maskable icon (circle / squircle / teardrop,
        // per launcher) and guarantees only the middle 80%; the `any` cuts are
        // full-bleed and would be sliced. Declaring one icon as both means it
        // is padded where it should be full-bleed, in the install dialog and
        // the task switcher. Built by `scripts/build-maskable-icon.mjs`.
        src: '/brand/icon/app-icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    /**
     * Long-press the home-screen icon. Same constraint as `start_url`: no ids
     * in a static manifest, so these can only be resolvers or public paths.
     */
    shortcuts: [
      {
        name: 'Explore shops',
        short_name: 'Explore',
        url: '/explore',
      },
      {
        name: 'Deals',
        short_name: 'Deals',
        url: '/explore/deals',
      },
      {
        name: 'My shop dashboard',
        short_name: 'My shop',
        // The resolver — it reads the session and redirects to the owner's own
        // `/business/<id>`, which is the only way to reach it without knowing
        // the id at build time.
        url: '/business',
      },
    ],
  };
}
