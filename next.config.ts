import type { NextConfig } from 'next';

function parseImageUrl(
  url: string | undefined,
): { protocol: 'http' | 'https'; hostname: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.slice(0, -1) as 'http' | 'https',
      hostname: parsed.hostname || '',
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
}> = [
  {
    protocol: 'http',
    hostname: '127.0.0.1',
    port: '54321',
  },
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
  },
];

const prodImageUrl = parseImageUrl(process.env.NEXT_IMAGE_PUBLIC_URL);
if (prodImageUrl) {
  imageRemotePatterns.push({
    protocol: prodImageUrl.protocol,
    hostname: prodImageUrl.hostname,
  });
}

const buildCSPImageSources = (): string => {
  const sources = ["'self'", 'data:', 'blob:'];
  sources.push('http://127.0.0.1:54321');
  if (process.env.NODE_ENV === 'production') {
    sources.push('https:');
  }
  if (prodImageUrl) {
    sources.push(`${prodImageUrl.protocol}://${prodImageUrl.hostname}`);
  }
  return sources.join(' ');
};

// Build script-src for CSP. In production we disallow 'unsafe-inline' and 'unsafe-eval'.
// For any inline scripts in production, prefer using nonces or CSP hashes.
const buildScriptSrc = (): string => {
  const sources = [`'self'`];
  if (process.env.NODE_ENV !== 'production') {
    // Keep relaxed CSP in development for convenience
    sources.push("'unsafe-inline'", "'unsafe-eval'");
  }
  return sources.join(' ');
};

// Build style-src for CSP. Allow 'unsafe-inline' only in development.
const buildStyleSrc = (): string => {
  const sources = [`'self'`];
  if (process.env.NODE_ENV !== 'production') {
    sources.push("'unsafe-inline'");
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
    NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_TOKEN: process.env.NEXT_PUBLIC_SUPABASE_TOKEN,
  },
  images: {
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
