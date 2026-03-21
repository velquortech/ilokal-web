/**
 * Authentication API Route - Signup
 *
 * POST /api/auth/signup - User registration
 *
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   confirmPassword: string,
 *   name: string,
 *   role: 'admin' | 'business_owner' | 'app_user',
 *   phone_number?: string,
 *   avatar_url?: string
 * }
 *
 * Response on success (201):
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
import { createServerSupabaseClient } from '@/config/server';
import { signupSchema } from '@/lib/validation/auth';
import type { User } from '@/lib/types';

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

/**
 * POST /api/auth/signup
 * Create new user account
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = signupSchema.safeParse(body);
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

    const { email, password, name, role, phone_number, avatar_url } =
      validation.data;

    // Create Supabase client
    const supabase = await createServerSupabaseClient();

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!checkError && existingUser) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Email already registered',
          },
        },
        { status: 409 },
      );
    }

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected)
      console.error(
        '[API] POST /api/auth/signup - Check error:',
        checkError.message,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to validate email availability',
          },
        },
        { status: 500 },
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
    });

    if (authError || !authData.user) {
      console.error(
        '[API] POST /api/auth/signup - Auth error:',
        authError?.message,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: authError?.message || 'Failed to create account',
          },
        },
        { status: 500 },
      );
    }

    // Prepare profile data
    const profileData: Record<string, unknown> = {
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      full_name: name.trim(),
      role,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optional phone number
    if (phone_number?.trim() && /\d/.test(phone_number)) {
      profileData.phone_number = phone_number.trim();
    }

    // Add optional avatar
    if (avatar_url?.trim()) {
      profileData.avatar_url = avatar_url.trim();
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      console.error(
        '[API] POST /api/auth/signup - Profile creation error:',
        profileError.message,
      );
      // Attempt cleanup
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {
        // Silently ignore cleanup errors
      });
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create user profile',
          },
        },
        { status: 500 },
      );
    }

    // Return user data
    const userData: User = {
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      full_name: name.trim(),
      phone_number: phone_number?.trim() || null,
      role: role as 'admin' | 'business_owner' | 'app_user',
      avatar_url: avatar_url?.trim() || null,
    };

    return NextResponse.json<ApiResponse<User>>(
      {
        success: true,
        data: userData,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[API] POST /api/auth/signup - Error:', error);
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
