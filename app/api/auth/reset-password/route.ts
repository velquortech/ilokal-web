/**
 * Authentication API Route - Reset Password
 *
 * POST /api/auth/reset-password - Password reset request
 *
 * This endpoint initiates the password reset flow. In production, this would:
 * 1. Accept email address
 * 2. Send password reset email with magic link
 * 3. User clicks link in email
 * 4. Link contains token to verify identity
 * 5. User can then set new password
 *
 * Request body (for initiating reset):
 * {
 *   email: string
 * }
 *
 * Request body (for setting new password with token):
 * {
 *   token: string,
 *   newPassword: string
 * }
 *
 * Response on success (200):
 * {
 *   success: true,
 *   message: "Password reset email sent" / "Password reset successfully"
 * }
 *
 * Response on error:
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import { checkAuthRateLimit } from '@/app/api/helpers/auth-rate-limit';
import { z } from 'zod';

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

// Validation schemas
const resetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetConfirmSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * POST /api/auth/reset-password
 * Initiate password reset or confirm with token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Throttle reset abuse (email enumeration / reset-mail spam). IP-keyed
    // always; account-keyed on the request branch where an email is present.
    const limited = checkAuthRateLimit(
      request,
      'reset',
      typeof body?.email === 'string' ? body.email : null,
    );
    if (limited) return limited;

    // Check if this is a reset request or confirmation
    if (body.token) {
      // Confirm password reset with token
      const validation = resetConfirmSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: validation.error.issues[0]?.message || 'Invalid input',
            },
          },
          { status: 400 },
        );
      }

      const { newPassword } = validation.data;
      const supabase = await createServerSupabaseClient();

      // Update password using token
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error(
          '[API] POST /api/auth/reset-password - Update error:',
          error.message,
        );
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to reset password',
            },
          },
          { status: 500 },
        );
      }

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: { message: 'Password reset successfully' },
        },
        { status: 200 },
      );
    } else {
      // Initiate password reset email
      const validation = resetRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: validation.error.issues[0]?.message || 'Invalid input',
            },
          },
          { status: 400 },
        );
      }

      const { email } = validation.data;
      const supabase = await createServerSupabaseClient();

      // Request password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password-confirm`,
      });

      if (error) {
        console.error(
          '[API] POST /api/auth/reset-password - Email error:',
          error.message,
        );
        // Don't reveal if email exists or not (security)
        return NextResponse.json<ApiResponse>(
          {
            success: true,
            data: {
              message:
                'If an account exists with that email, a reset link has been sent',
            },
          },
          { status: 200 },
        );
      }

      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: {
            message: 'Password reset email sent. Please check your inbox.',
          },
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error('[API] POST /api/auth/reset-password - Error:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 },
    );
  }
}
