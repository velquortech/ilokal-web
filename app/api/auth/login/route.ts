/**
 * Authentication API Route - Login
 *
 * POST /api/auth/login - User login (email/password)
 *
 * Request body:
 * {
 *   email: string,
 *   password: string
 * }
 *
 * Response on success (200):
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     email: string,
 *     full_name: string,
 *     role: 'admin' | 'business_owner' | 'app_user',
 *     avatar_url?: string
 *   }
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
import { loginSchema } from '@/lib/validation/auth';
import type { User } from '@/lib/types';

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues;
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: errors[0]?.message || 'Invalid input',
          },
        },
        { status: 400 },
      );
    }

    const { email, password } = validation.data;

    // Create Supabase client
    const supabase = await createServerSupabaseClient();

    // Attempt login
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      console.error(
        '[API] POST /api/auth/login - Auth error:',
        authError?.message,
      );
      // Generic error to prevent account enumeration
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Invalid email or password',
          },
        },
        { status: 401 },
      );
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, phone_number, role, avatar_url, status, archived_at',
      )
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error(
        '[API] POST /api/auth/login - Profile fetch error:',
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

    // Check if account is archived
    if (profile.archived_at) {
      console.warn(
        `[API] POST /api/auth/login - Archived user login attempt: ${authData.user.id}`,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Your account has been archived',
          },
        },
        { status: 403 },
      );
    }

    // Check if account is active
    if (profile.status !== 'active') {
      console.warn(
        `[API] POST /api/auth/login - Inactive user login attempt: ${authData.user.id} status=${profile.status}`,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: `Your account is ${profile.status}. Please contact support.`,
          },
        },
        { status: 403 },
      );
    }

    // Return user data (session is in HTTP-only cookie)
    const userData: User = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone_number: profile.phone_number,
      role: profile.role as 'admin' | 'business_owner' | 'app_user',
      avatar_url: profile.avatar_url,
    };

    return NextResponse.json<ApiResponse<User>>(
      {
        success: true,
        data: userData,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] POST /api/auth/login - Error:', error);
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
