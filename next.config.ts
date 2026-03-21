import type { NextConfig } from 'next';

// Helper to safely parse URLs from environment variables
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

// Build image remote patterns
const imageRemotePatterns: Array<{
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
}> = [
  // Local Supabase storage (development)
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

// Add production Supabase storage if configured
const prodImageUrl = parseImageUrl(process.env.NEXT_IMAGE_PUBLIC_URL);
if (prodImageUrl) {
  imageRemotePatterns.push({
    protocol: prodImageUrl.protocol,
    hostname: prodImageUrl.hostname,
  });
}

// Build CSP image sources that match remote patterns
const buildCSPImageSources = (): string => {
  const sources = ["'self'", 'data:', 'blob:'];

  // Always allow local Supabase storage for development
  sources.push('http://127.0.0.1:54321');

  // Allow HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    sources.push('https:');
  }

  // Add specific production image domain if configured (for both dev and prod)
  if (prodImageUrl) {
    sources.push(`${prodImageUrl.protocol}://${prodImageUrl.hostname}`);
  }

  return sources.join(' ');
};

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_IMAGE_PUBLIC_URL: process.env.NEXT_IMAGE_PUBLIC_URL,
    NEXT_PUBLIC_DESTINATION: process.env.NEXT_PUBLIC_DESTINATION,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY,
    NEXT_PUBLIC_SUPABASE_DB_URL: process.env.NEXT_PUBLIC_SUPABASE_DB_URL,
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
          // CORS and Origin headers
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          },
          // Security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Prevents MIME-type sniffing
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Prevents clickjacking
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block', // XSS protection
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          // HTTPS enforcement (in production)
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
          // Content-Security-Policy - dynamically built to include all image sources
          {
            key: 'Content-Security-Policy',
            value: `
                default-src 'self';
                script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://www.youtube.com https://s.ytimg.com;
                style-src 'self' 'unsafe-inline';
                img-src ${buildCSPImageSources()} https://i.ytimg.com;
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
