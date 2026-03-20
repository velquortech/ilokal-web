import type { NextConfig } from 'next';

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
    remotePatterns: [new URL(`${process.env.NEXT_IMAGE_PUBLIC_URL}`)],
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
