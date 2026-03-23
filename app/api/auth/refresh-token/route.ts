/**
 * Authentication API Route - Refresh Token
 *
 * POST /api/auth/refresh-token - Refresh JWT token
 *
 * This endpoint refreshes the user's session token when the current
 * token is about to expire. The session cookie is automatically handled
 * by Supabase, so this endpoint forces a token refresh.
 *
 * Response on success (200):
 * {
 *   success: true,
 *   data: {
 *     user: { id, email, role, ... }
 *   }
 * }
 *
 * Response on error:
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import type { User } from '@/lib/types';

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

/**
 * POST /api/auth/refresh-token
 * Refresh user session token
 */
export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current user session
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

    // Fetch fresh profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, role, avatar_url, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        '[API] POST /api/auth/refresh-token - Profile fetch error:',
        profileError?.message,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User profile not found',
          },
        },
        { status: 404 },
      );
    }

    // Verify user is still active
    if (profile.status !== 'active') {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'User account is not active',
          },
        },
        { status: 403 },
      );
    }

    // Return refreshed user data
    const userData: User = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      role: profile.role as 'admin' | 'business_owner' | 'app_user',
      avatar_url: profile.avatar_url,
    };

    return NextResponse.json<ApiResponse<{ user: User }>>(
      {
        success: true,
        data: { user: userData },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] POST /api/auth/refresh-token - Error:', error);
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
