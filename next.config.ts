import { existsSync, readFileSync } from 'node:fs';
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

function parseImageUrl(url: string | undefined): {
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
} | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.slice(0, -1) as 'http' | 'https',
      hostname: parsed.hostname || '',
      ...(parsed.port ? { port: parsed.port } : {}),
    };
  } catch {
    console.warn(`Invalid image URL: ${url}`);
    return null;
  }
}

const imageRemotePatterns: Array<{
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname?: string;
}> = [
  // The local Supabase stack (127.0.0.1:54321 / localhost:54321) is NOT listed
  // here: in dev the optimizer is globally disabled (images.unoptimized below),
  // so remotePatterns is never consulted; in prod storage URLs point at the
  // cloud host, which arrives via prodImageUrl from NEXT_IMAGE_PUBLIC_URL.
  // The dev storage origin still reaches the CSP img-src below via
  // NEXT_PUBLIC_SUPABASE_URL (the host storage URLs are actually built from),
  // so local images keep loading with either hostname.
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'picsum.photos',
    pathname: '/**',
  },
];

const prodImageUrl = parseImageUrl(process.env.NEXT_IMAGE_PUBLIC_URL);
if (prodImageUrl) {
  imageRemotePatterns.push({
    protocol: prodImageUrl.protocol,
    hostname: prodImageUrl.hostname,
    ...(prodImageUrl.port ? { port: prodImageUrl.port } : {}),
    pathname: '/**',
  });
}

/**
 * Dev-only: the LIVE storage origin, read from the git-ignored `.env.cloud`
 * (the same file pull-live.sh reads for live credentials).
 *
 * Local rows can carry ABSOLUTE cloud storage URLs — `make pull-live` restores
 * live data verbatim and no longer rewrites rows — and the dev CSP otherwise
 * only knows the local stack (NEXT_PUBLIC_SUPABASE_URL → 127.0.0.1:54321), so
 * those images would render as broken in local dev even though the files
 * exist. Widening img-src with the cloud origin lets absolute URLs load
 * directly; production already allows a bare `https:` and needs none of this.
 *
 * Returns null in production, when `.env.cloud` is absent, or when the URL
 * cannot be parsed — so a machine without the file just keeps the old, local-
 * only dev CSP.
 */
const liveStorageOrigin = (): string | null => {
  if (process.env.NODE_ENV === 'production') return null;
  try {
    if (!existsSync('.env.cloud')) return null;
    const match = readFileSync('.env.cloud', 'utf8').match(
      /^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m,
    );
    if (!match) return null;
    const parsed = parseImageUrl(match[1].trim().replace(/^"|"$/g, ''));
    if (!parsed) return null;
    return parsed.port
      ? `${parsed.protocol}://${parsed.hostname}:${parsed.port}`
      : `${parsed.protocol}://${parsed.hostname}`;
  } catch {
    return null;
  }
};

const buildCSPImageSources = (): string => {
  const sources = ["'self'", 'data:', 'blob:'];
  // Derive allowed image sources from the same list Next.js uses for remotePatterns
  // so CSP and next/image config never diverge.
  for (const pattern of imageRemotePatterns) {
    const origin = pattern.port
      ? `${pattern.protocol}://${pattern.hostname}:${pattern.port}`
      : `${pattern.protocol}://${pattern.hostname}`;
    if (!sources.includes(origin)) sources.push(origin);
  }
  if (process.env.NODE_ENV === 'production') {
    sources.push('https:');
  }
  // Demo: allow the public storage tunnel host so the share landing page's
  // <img> isn't CSP-blocked in real browsers (dev only; prod already has https:).
  if (process.env.NEXT_PUBLIC_PUBLIC_STORAGE_URL) {
    sources.push(process.env.NEXT_PUBLIC_PUBLIC_STORAGE_URL);
  }
  // Storage image URLs are built from the Supabase client's URL
  // (supabase.storage.getPublicUrl → NEXT_PUBLIC_SUPABASE_URL), NOT from
  // NEXT_IMAGE_PUBLIC_URL. In dev that is the local stack — e.g.
  // http://127.0.0.1:54321 or http://localhost:54321 — and a host-only origin
  // (`http://127.0.0.1`) would NOT match the `:54321` port in img-src. Derive
  // it here (with port) so dev storage images keep loading whether or not
  // NEXT_IMAGE_PUBLIC_URL is set, and regardless of which hostname is used.
  // prodImageUrl needs no explicit push: it is already in imageRemotePatterns,
  // so the loop above emitted it (with its port, deduped).
  const storageUrl = parseImageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (storageUrl) {
    const origin = storageUrl.port
      ? `${storageUrl.protocol}://${storageUrl.hostname}:${storageUrl.port}`
      : `${storageUrl.protocol}://${storageUrl.hostname}`;
    if (!sources.includes(origin)) sources.push(origin);
  }
  // Dev-only: allow the live cloud storage origin so absolute cloud URLs in
  // local rows render without rewriting row data (see liveStorageOrigin).
  const cloudOrigin = liveStorageOrigin();
  if (cloudOrigin && !sources.includes(cloudOrigin)) sources.push(cloudOrigin);
  return sources.join(' ');
};

const nextConfig: NextConfig = {
  // The dev server 403s cross-origin dev resources (HMR websocket, dev fonts,
  // overlay) unless the requesting host is in this allowlist — and the
  // built-in defaults only cover localhost/*.localhost (see
  // block-cross-site-dev.ts: allowedOrigins = ['*.localhost', 'localhost',
  // ...allowedDevOrigins]). A browser hitting 127.0.0.1 — curl, headless
  // testing, Freebuff's preview, a phone on the LAN — gets those requests
  // blocked, and on this app that silently breaks hydration: forms submit
  // natively as GETs and every onClick is dead. Dev-only; ignored outside
  // development. This APPENDS to the localhost defaults, it does not replace
  // them.
  allowedDevOrigins: ['127.0.0.1'],
  // The welcome-post renderer reads brand fonts off disk at request time, and
  // builds the path dynamically (`assets/fonts/${base}.${ext}` across a list of
  // candidate cuts). Output file tracing works by static analysis, so it cannot
  // see those reads — without this the files are absent from a standalone
  // build and every render falls back to the bundled Geist, i.e. silently
  // off-brand in production while correct in dev.
  //
  // `public/brand/wordmark` is here for the same reason: the lockup is inlined
  // from disk rather than fetched over HTTP, so it is a server-side read now,
  // not just a static asset.
  outputFileTracingIncludes: {
    '/api/admin/welcome-post': [
      './assets/fonts/**',
      './public/brand/wordmark/**',
      // The bundled fallback face. Read as a file (Turbopack refuses to
      // BUNDLE a .ttf — "Unknown module type"), so the path is assembled and
      // the tracer cannot see it either.
      './node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf',
    ],
  },
  experimental: {
    serverActions: {
      // Server Actions default to a 1 MB request body, but the product-image
      // upload action (and the branch/registration ones) accept files up to
      // 2 MB — so a valid 2 MB image was rejected by the transport with a 413
      // ("Body exceeded 1 MB limit") before the handler's own size check ran.
      // 3 MB leaves headroom for multipart boundaries + the other form fields,
      // and stays well under Vercel's 4.5 MB platform body cap.
      bodySizeLimit: '3mb',
    },
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_IMAGE_PUBLIC_URL: process.env.NEXT_IMAGE_PUBLIC_URL,
    NEXT_PUBLIC_DESTINATION: process.env.NEXT_PUBLIC_DESTINATION,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_TOKEN: process.env.NEXT_PUBLIC_SUPABASE_TOKEN,
  },
  images: {
    // Next.js blocks optimization requests to private IPs (127.0.0.1) as SSRF
    // protection. In dev, Supabase Storage runs on localhost so we skip
    // optimization here; production uses a public URL and optimizes normally.
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: imageRemotePatterns,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: `${process.env.NEXT_PUBLIC_DESTINATION}`,
        permanent: true,
      },
      // Sign-in unification: legacy login doors → /sign-in (query string is
      // preserved automatically, so ?next= / ?reset=1 / ?error= survive).
      // permanent:false (307) until the new door has soaked — browsers cache
      // 308s, which would outlive a rollback. Flip to permanent:true in a
      // follow-up. See .claude/SIGNIN_UNIFICATION.md.
      {
        source: '/login',
        destination: '/sign-in',
        permanent: false,
      },
      {
        source: '/login/business',
        destination: '/sign-in',
        permanent: false,
      },
      {
        source: '/login/admin',
        destination: '/sign-in/admin',
        permanent: false,
      },
      // Events settled on the plural collection + camelCase segment every other
      // route uses (`/explore/[businessId]`, `/business/[businessId]`). The
      // singular form is kept so any link already shared keeps working.
      // permanent:false for the same reason as the login redirects — browsers
      // cache a 308 past a rollback.
      {
        source: '/event/:eventId',
        destination: '/events/:eventId',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), microphone=(), camera=()',
          },
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
          {
            key: 'Content-Security-Policy',
            value: `
                default-src 'self';
                script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://www.youtube.com https://s.ytimg.com;
                style-src 'self' 'unsafe-inline';
                img-src ${buildCSPImageSources()} https://i.ytimg.com https://*.tile.openstreetmap.org;
                frame-src 'self' https://www.google.com https://www.youtube.com https://youtube.com;
                connect-src 'self' https://maps.googleapis.com https://nominatim.openstreetmap.org http://127.0.0.1:54321 ${process.env.NEXT_PUBLIC_SUPABASE_URL || ''};
                font-src 'self' data:;
              `
              .replace(/\s{2,}/g, ' ')
              .trim(),
          },
        ],
      },
    ];
  },
};

// Sentry wraps the whole config object, so everything above has to survive the
// wrap — in particular `outputFileTracingIncludes` (the welcome-post brand
// fonts, whose absence is silent and visible only as off-brand output in
// production) and `experimental.serverActions.bodySizeLimit`. Both are asserted
// in `__test__/config/sentry-config.contract.test.ts`.
//
// 🔴 Browser events go through a SAME-ORIGIN tunnel, not straight to Sentry.
//
// Two reasons, and the first is the one that decided it (SN4). The CSP above is
// hand-maintained and `connect-src` currently names exactly three origins; the
// alternative was widening it with a third-party wildcard
// (`https://*.ingest.sentry.io`). The tunnel means the CSP does not change at
// all — the request is same-origin, already covered by `'self'` — so there is no
// way to get this subtly wrong, and no way for a future CSP edit to silently
// break reporting. That failure mode is the dangerous one: a client install
// appears to work in dev and sends nothing in production.
//
// Second, ad-blockers block requests to Sentry's ingest hosts by name, which
// quietly drops a slice of real user errors.
//
// ⚠️ The cost: `/monitoring` is an unauthenticated POST endpoint that forwards
// bodies to Sentry, i.e. a way for anyone to burn the event quota (SN9). It is
// rate-limited by IP in `proxy.ts`, which is why that path is in the matcher.
export default withSentryConfig(nextConfig, {
  tunnelRoute: '/monitoring',

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Keep build logs quiet unless something is actually wrong.
  silent: !process.env.CI,

  // Upload maps but do not serve them: a public `.map` next to the bundle hands
  // the full server and client source to anyone who asks for it.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // `disableLogger` is deliberately NOT set here. The build warns that it is
  // deprecated AND "Not supported with Turbopack", which is what this repo
  // builds with, and its replacement (`webpack.treeshake.removeDebugLogging`)
  // is webpack-only. Measured cost of setting it anyway: see the CHANGELOG.

  // Now that the browser is instrumented, a client stack trace is only useful
  // if the maps for those bundles were uploaded too.
  widenClientFileUpload: true,
});
