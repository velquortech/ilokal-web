import { unauthorizedResponse } from '@/app/api/helpers/response';
import { NextFetchEvent, NextProxy, NextRequest } from 'next/server';

export function authMiddlware(next: NextProxy) {
  return async (req: NextRequest, event: NextFetchEvent) => {
    const isAuthenticated = req.cookies.get(
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_TOKEN}-auth-token`,
    );

    if (req.nextUrl.pathname.startsWith('/api/protected')) {
      if (!isAuthenticated) {
        return unauthorizedResponse();
      }
    }

    return next(req, event);
  };
}

export const config = {
  matcher: '/api/protected/:path*',
};
