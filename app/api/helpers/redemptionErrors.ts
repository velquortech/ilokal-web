import { NextResponse } from 'next/server';
import { loggedServerError } from '@/app/api/helpers/response';

/**
 * Maps the redemption RPCs' stable error codes to HTTP responses.
 *
 * `redeem_coupon` / `claim_my_redemption` (migration 20261024000000) raise with
 * MESSAGE = a machine code and HINT = the user-facing line — the same contract
 * as the review RPCs (`reviewErrors.ts`). Each status is the one the route
 * returned before the gates moved into SQL, so the mobile client sees no
 * change beyond the added `code` field. Anything unknown is a real server
 * error and goes through the logged 500 funnel, never forwarding DB text.
 */
export const REDEMPTION_ERROR_STATUS: Record<string, number> = {
  UNAUTHENTICATED: 401,
  COUPON_NOT_FOUND: 400,
  BRANCH_MISMATCH: 400,
  COUPON_EXPIRED: 400,
  COUPON_LIMIT_REACHED: 400,
  FOLLOW_REQUIRED: 403,
  ALREADY_IN_WALLET: 400,
  PER_USER_LIMIT_REACHED: 400,
  REDEMPTION_NOT_FOUND: 404,
  ALREADY_CLAIMED: 400,
  REDEMPTION_EXPIRED: 400,
};

export type RpcError = {
  message?: string;
  hint?: string | null;
};

/** The machine code when `error` is one of the RPCs' known codes, else null. */
export function redemptionErrorCode(error: RpcError): string | null {
  const code = error.message ?? '';
  return code in REDEMPTION_ERROR_STATUS ? code : null;
}

export function redemptionErrorResponse(
  context: string,
  error: RpcError,
  userId?: string,
): Response {
  const code = redemptionErrorCode(error);
  if (!code) return loggedServerError(context, error, userId);
  return new NextResponse(
    JSON.stringify({ code, message: error.hint || code }),
    {
      status: REDEMPTION_ERROR_STATUS[code],
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
