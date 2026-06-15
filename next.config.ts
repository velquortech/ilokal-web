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
