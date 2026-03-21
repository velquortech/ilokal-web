/**
 * Authentication API Route - Logout
 *
 * POST /api/auth/logout - User logout
 *
 * Response on success (200):
 * {
 *   success: true,
 *   message: "Logged out successfully"
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
 * POST /api/auth/logout
 * Sign out current user
 */
export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    // Sign out user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[API] POST /api/auth/logout - Error:', error.message);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to sign out',
          },
        },
        { status: 500 },
      );
    }

    console.info('[API] POST /api/auth/logout - User signed out successfully');

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { message: 'Logged out successfully' },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] POST /api/auth/logout - Error:', error);
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
