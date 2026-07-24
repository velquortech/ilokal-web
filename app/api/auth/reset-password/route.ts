/**
 * Authentication API Route — Reset Password (business web flow)
 *
 * POST /api/auth/reset-password
 *
 * Two branches, distinguished by the body:
 *
 * 1. Request  { email }
 *    - Mint a recovery link with the service-role admin client
 *      (`auth.admin.generateLink`, type 'recovery') — this does NOT send.
 *    - Send our own branded email via Resend (or, with no RESEND_API_KEY, log
 *      the link locally — see `sendResetEmail`).
 *    - ALWAYS returns a generic success, even for a non-existent email, so the
 *      endpoint can't be used to enumerate accounts.
 *
 * 2. Confirm  { token_hash, password }
 *    - `verifyOtp({ token_hash, type: 'recovery' })` establishes a short-lived
 *      recovery session (cookie), then `updateUser({ password })` sets the new
 *      password, then `signOut()` so the recovery session can't linger.
 *
 * No raw Supabase error text is returned to the client (SEC-5).
 */

import { NextRequest, NextResponse, after } from 'next/server';
import {
  createServerSupabaseClient,
  createServerAdminClient,
} from '@/supabase/server';
import { checkAuthRateLimit } from '@/app/api/helpers/auth-rate-limit';
import { sendResetEmail } from '@/app/api/emails/sendResetEmail';
import {
  resetPasswordRequestSchema,
  resetPasswordConfirmSchema,
} from '@/lib/validation/auth';

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

const GENERIC_REQUEST_MESSAGE =
  'If an account exists with that email, a reset link has been sent.';

function jsonError(
  code: string,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json<ApiResponse>(
    { success: false, error: { code, message } },
    { status },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Throttle reset abuse (enumeration / reset-mail spam). IP-keyed always;
    // account-keyed on the request branch where an email is present.
    const limited = checkAuthRateLimit(
      request,
      'reset',
      typeof body?.email === 'string' ? body.email : null,
    );
    if (limited) return limited;

    // ---- Confirm branch -------------------------------------------------
    if (body?.token_hash) {
      const parsed = resetPasswordConfirmSchema.safeParse(body);
      if (!parsed.success) {
        return jsonError(
          'VALIDATION_ERROR',
          parsed.error.issues[0]?.message || 'Invalid input',
          400,
        );
      }

      const { token_hash, password } = parsed.data;
      const supabase = await createServerSupabaseClient();

      // Establish the recovery session from the emailed token hash.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      });
      if (verifyError) {
        console.error(
          '[API] reset-password confirm — verifyOtp error:',
          verifyError.message,
        );
        return jsonError(
          'INVALID_TOKEN',
          'This reset link is invalid or has expired. Please request a new one.',
          400,
        );
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      // verifyOtp established a full recovery session — always tear it down
      // before returning (success OR failure), so a failed update can't leave a
      // working authenticated session with the password unchanged.
      await supabase.auth.signOut();

      if (updateError) {
        console.error(
          '[API] reset-password confirm — updateUser error:',
          updateError.message,
        );
        return jsonError('INTERNAL_ERROR', 'Failed to reset password.', 500);
      }

      return NextResponse.json<ApiResponse>(
        { success: true, data: { message: 'Password reset successfully.' } },
        { status: 200 },
      );
    }

    // ---- Request branch -------------------------------------------------
    const parsed = resetPasswordRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message || 'Invalid input',
        400,
      );
    }

    const { email } = parsed.data;

    // Fail closed: the reset link's host must come from our own configured URL,
    // never from the request (a spoofed Host/X-Forwarded-Host header would
    // poison the emailed link — reset-link poisoning → account takeover). If the
    // base URL isn't configured, log and return the generic 200 without sending.
    const base = process.env.NEXT_PUBLIC_APP_URL;
    if (!base) {
      console.error(
        '[API] reset-password request — NEXT_PUBLIC_APP_URL not set; cannot build a safe reset link. Not sending.',
      );
      return NextResponse.json<ApiResponse>(
        { success: true, data: { message: GENERIC_REQUEST_MESSAGE } },
        { status: 200 },
      );
    }

    try {
      const admin = await createServerAdminClient();
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
      });

      const tokenHash = data?.properties?.hashed_token;
      if (error || !tokenHash) {
        // Non-existent email or admin failure — do NOT reveal it.
        if (error) {
          console.error(
            '[API] reset-password request — generateLink error:',
            error.message,
          );
        }
      } else {
        const url = `${base}/reset-password?token_hash=${encodeURIComponent(
          tokenHash,
        )}&type=recovery`;
        // Send AFTER the response so the send latency can't be used as a
        // timing oracle to distinguish existing vs non-existent accounts
        // (existing accounts would otherwise wait on the Resend POST).
        // `sendResetEmail` never throws.
        after(() => sendResetEmail({ to: email, url }));
      }
    } catch (err) {
      console.error(
        '[API] reset-password request — unexpected error:',
        err instanceof Error ? err.message : err,
      );
    }

    // Generic response regardless of outcome (no enumeration).
    return NextResponse.json<ApiResponse>(
      { success: true, data: { message: GENERIC_REQUEST_MESSAGE } },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] POST /api/auth/reset-password — Error:', error);
    return jsonError('INTERNAL_ERROR', 'An unexpected error occurred.', 500);
  }
}
