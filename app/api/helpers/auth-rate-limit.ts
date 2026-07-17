// Rate limiting for the auth surface (login / signup / reset-password).
//
// The proxy rate-limits the mobile API but its matcher does NOT cover /api/auth,
// and only a handler can read the request body to key by account. So auth routes
// call checkAuthRateLimit() themselves. Two independent budgets:
//   • per-IP    — a flood guard against credential stuffing from one source.
//   • per-account (email) — throttles targeting of a single account (and reset
//     spam), tighter and over a longer window.
// Either tripping returns a 429 with Retry-After. See .claude/PERFORMANCE_AUDIT.md
// (SEC-8) and auth-rate-limits.md. Same in-memory/per-instance limitation as
// rateLimit.ts — a baseline guard, not a distributed quota (swap for Upstash/KV).

import type { NextResponse } from 'next/server';
import { rateLimit, clientIp } from './rateLimit';
import { tooManyRequestsResponse } from './response';

const IP_LIMIT = Number(process.env.AUTH_RATE_LIMIT_IP ?? 30);
const IP_WINDOW_MS = Number(process.env.AUTH_RATE_WINDOW_MS ?? 60_000);
const ACCOUNT_LIMIT = Number(process.env.AUTH_RATE_LIMIT_ACCOUNT ?? 8);
const ACCOUNT_WINDOW_MS = Number(process.env.AUTH_ACCOUNT_WINDOW_MS ?? 300_000);

/**
 * Enforce the auth rate limit for a request. Always checks the caller IP; when an
 * `email` is given, also checks the per-account budget. Returns a ready-to-return
 * 429 `Response` if either budget is exceeded, otherwise `null` (proceed).
 *
 * @param scope  short label per endpoint ('login' | 'signup' | 'reset') so budgets
 *               don't bleed across endpoints.
 */
export function checkAuthRateLimit(
  req: { headers: Headers },
  scope: string,
  email?: string | null,
): NextResponse | null {
  const ip = clientIp(req);
  const ipCheck = rateLimit(`auth:${scope}:ip:${ip}`, IP_LIMIT, IP_WINDOW_MS);
  if (!ipCheck.allowed) return tooManyRequestsResponse(ipCheck.retryAfterSec);

  if (email) {
    const key = `auth:${scope}:acct:${email.trim().toLowerCase()}`;
    const acctCheck = rateLimit(key, ACCOUNT_LIMIT, ACCOUNT_WINDOW_MS);
    if (!acctCheck.allowed) {
      return tooManyRequestsResponse(acctCheck.retryAfterSec);
    }
  }

  return null;
}
