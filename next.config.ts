import type { NextConfig } from 'next';

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
  {
    protocol: 'http',
    hostname: '127.0.0.1',
    port: '54321',
    pathname: '/**',
  },
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '54321',
    pathname: '/**',
  },
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
  if (prodImageUrl) {
    sources.push(`${prodImageUrl.protocol}://${prodImageUrl.hostname}`);
  }
  return sources.join(' ');
};

const nextConfig: NextConfig = {
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
                connect-src 'self' https://maps.googleapis.com http://127.0.0.1:54321 ${process.env.NEXT_PUBLIC_SUPABASE_URL || ''};
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

export default nextConfig;
