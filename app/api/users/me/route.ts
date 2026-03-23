/**
 * User Profile API Route - Current User
 *
 * GET /api/users/me - Get current user profile
 * PUT /api/users/me - Update current user profile (delegated to server action)
 *
 * GET Response on success (200):
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     email: string,
 *     full_name: string,
 *     phone_number?: string,
 *     role: 'admin' | 'business_owner' | 'app_user',
 *     avatar_url?: string,
 *     status: string
 *   }
 * }
 *
 * PUT Request body:
 * {
 *   full_name?: string,
 *   phone_number?: string,
 *   avatar_url?: string
 * }
 *
 * Response on error:
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * NOTE: PUT mutations should use the server action updateCurrentUserProfileAction()
 * instead of calling this API endpoint directly for better DX and type safety.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import type { ApiResponse } from '@/lib/types/common';
import { updateCurrentUserProfileSchema } from '@/lib/validation/auth';
import {
  updateUserProfile,
  mapProfileToUser,
  PROFILE_SELECT_FIELDS,
} from '@/lib/api/users/userService';
import type { User } from '@/lib/types';

/**
 * GET /api/users/me
 * Get current user profile
 */
export async function GET(): Promise<NextResponse> {
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
            message: 'Authentication required',
          },
        },
        { status: 401 },
      );
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT_FIELDS)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        '[API] GET /api/users/me - Profile fetch error:',
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

    const userData = mapProfileToUser(profile);

    return NextResponse.json<ApiResponse<User>>(
      {
        success: true,
        data: userData,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] GET /api/users/me - Error:', error);
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

/**
 * PUT /api/users/me
 * Update current user profile
 *
 * Uses shared updateUserProfile service for consistency with server action.
 * Delegates to server action for better DX (useActionState integration).
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
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
            message: 'Authentication required',
          },
        },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateCurrentUserProfileSchema.safeParse(body);

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

    // Call shared service
    const updated = await updateUserProfile(user.id, validation.data);

    return NextResponse.json<ApiResponse<User>>(
      {
        success: true,
        data: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] PUT /api/users/me - Error:', error);
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
