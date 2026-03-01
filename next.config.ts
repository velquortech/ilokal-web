import type { NextConfig } from 'next';

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
    remotePatterns: [
      // Local Supabase storage (development)
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
      },
      // Production Supabase storage (will be added from env vars)
      ...(process.env.NEXT_IMAGE_PUBLIC_URL
        ? [
            {
              protocol: new URL(
                process.env.NEXT_IMAGE_PUBLIC_URL,
              ).protocol.slice(0, -1) as 'http' | 'https',
              hostname: new URL(process.env.NEXT_IMAGE_PUBLIC_URL).hostname!,
            },
          ]
        : []),
    ],
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
};

export default nextConfig;
