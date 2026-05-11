import { unauthorizedResponse } from '@/app/api/helpers/response';
import { NextFetchEvent, NextProxy, NextRequest } from 'next/server';

export function authMiddlware(next: NextProxy) {
  return async (req: NextRequest, event: NextFetchEvent) => {
    const cookieAuth = req.cookies.get(
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_TOKEN}-auth-token`,
    );
    const bearerAuth = req.headers.get('Authorization')?.startsWith('Bearer ')
      ? req.headers.get('Authorization')
      : null;

    const isAuthenticated = cookieAuth ?? bearerAuth;

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
