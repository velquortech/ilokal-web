/**
 * Authentication API Route - Verify Email
 *
 * POST /api/auth/verify-email - Email verification
 *
 * This endpoint marks a user's email as verified. In production, this would
 * typically be called after clicking an email verification link.
 *
 * Request body:
 * {
 *   token?: string  (optional - would contain magic link token from email)
 * }
 *
 * Response on success (200):
 * {
 *   success: true,
 *   message: "Email verified successfully"
 * }
 *
 * Response on error:
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/config/server';

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

/**
 * POST /api/auth/verify-email
 * Verify user email address
 */
export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'No active session',
          },
        },
        { status: 401 },
      );
    }

    // In a real implementation, you would:
    // 1. Use the token from the email link (or from request body)
    // 2. Call supabase.auth.verifyOtp() to verify the token
    // 3. Mark email as verified in the profiles table

    // For now, update the profile to mark email as verified
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(
        '[API] POST /api/auth/verify-email - Update error:',
        updateError.message,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to verify email',
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { message: 'Email verified successfully' },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] POST /api/auth/verify-email - Error:', error);
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
