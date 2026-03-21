/**
 * User Profile API Route - Current User
 *
 * GET /api/users/me - Get current user profile
 * PUT /api/users/me - Update current user profile
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
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/config/server';
import { z } from 'zod';
import type { User } from '@/lib/types';

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone_number: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

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
      .select(
        'id, email, full_name, phone_number, role, avatar_url, status, archived_at',
      )
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
    const validation = updateProfileSchema.safeParse(body);

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

    const { full_name, phone_number, avatar_url } = validation.data;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) {
      updateData.full_name = full_name;
    }

    if (phone_number !== undefined) {
      updateData.phone_number = phone_number || null;
    }

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url || null;
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error(
        '[API] PUT /api/users/me - Update error:',
        updateError.message,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update profile',
          },
        },
        { status: 500 },
      );
    }

    // Fetch updated profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, phone_number, role, avatar_url, status, archived_at',
      )
      .eq('id', user.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch updated profile',
          },
        },
        { status: 500 },
      );
    }

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
