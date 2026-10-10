import { NextResponse, type NextRequest } from 'next/server';

import { clientIp, rateLimit } from '@/app/api/helpers/rateLimit';
import { ROUTES } from '@/config/routeConfig';
import {
  SIGNUP_REF_COOKIE,
  SIGNUP_REF_MAX_AGE_S,
  VISITOR_COOKIE,
  parseSignupRef,
} from '@/lib/utils/signupRef';
import { formatErrorForLog } from '@/lib/utils/describeDbError';
import { createServerSupabaseClient } from '@/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// A real visitor taps a handful of times; past this an address stops being
// counted (it is still forwarded — tracking never blocks the page).
const RECORD_LIMIT = 20;
const RECORD_WINDOW_MS = 60_000;

/**
 * GET /for-business/go?ref=<ref> — the tracked way into /for-business.
 *
 * The mobile app's "List your business" link points here. Each request is one
 * tap: it is recorded, the ref is remembered for `signupAction`, and the
 * visitor lands on /for-business either way.
 */
export async function GET(req: NextRequest) {
  const ref = parseSignupRef(req.nextUrl.searchParams.get('ref'));
  const res = NextResponse.redirect(
    new URL(ROUTES.PUBLIC.FOR_BUSINESS, req.url),
    303,
  );
  res.headers.set('Cache-Control', 'no-store');
  if (!ref) return res;

  const existing = req.cookies.get(VISITOR_COOKIE)?.value;
  const visitor =
    existing && UUID.test(existing) ? existing : crypto.randomUUID();
  const secure = process.env.NODE_ENV === 'production';

  if (
    rateLimit(`funnel:${clientIp(req)}`, RECORD_LIMIT, RECORD_WINDOW_MS).allowed
  ) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.rpc('record_registration_landing', {
        p_ref: ref,
        p_visitor: visitor,
      });
      if (error) {
        console.error(
          '[for-business/go] record failed:',
          formatErrorForLog(error),
        );
      }
    } catch (error) {
      console.error(
        '[for-business/go] record failed:',
        formatErrorForLog(error),
      );
    }
  }

  res.cookies.set(SIGNUP_REF_COOKIE, ref, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SIGNUP_REF_MAX_AGE_S,
  });
  res.cookies.set(VISITOR_COOKIE, visitor, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
