/**
 * User Profile API Route - Individual User (Admin Only)
 *
 * GET /api/users/:id - Get user by ID (admin only)
 * PUT /api/users/:id - Update user (admin only)
 * DELETE /api/users/:id - Delete/archive user (admin only)
 *
 * Response on success:
 * {
 *   success: true,
 *   data: { user profile object }
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

const uuidSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

const updateUserSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  avatar_url: z.string().url().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

type VerifyAdminResult = {
  authorized: boolean;
  response?: NextResponse<ApiResponse>;
};

/**
 * Verify current user is admin
 */
async function verifyAdminAccess(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<VerifyAdminResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
          },
        },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || profile?.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Only admins can access this resource',
          },
        },
        { status: 403 },
      ),
    };
  }

  return { authorized: true };
}

/**
 * GET /api/users/:id
 * Get user by ID (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const result = await verifyAdminAccess(supabase);

    if (!result.authorized) {
      return result.response!;
    }

    const { id } = await params;
    const validation = uuidSchema.safeParse({ id });

    if (!validation.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID format',
          },
        },
        { status: 400 },
      );
    }

    // Fetch user profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, phone_number, role, avatar_url, status, created_at, updated_at',
      )
      .eq('id', validation.data.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
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
    console.error('[API] GET /api/users/:id - Error:', error);
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
 * PUT /api/users/:id
 * Update user (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const result = await verifyAdminAccess(supabase);

    if (!result.authorized) {
      return result.response!;
    }

    const { id } = await params;
    const validation = uuidSchema.safeParse({ id });

    if (!validation.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID format',
          },
        },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const bodyValidation = updateUserSchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: bodyValidation.error.issues[0]?.message || 'Invalid input',
          },
        },
        { status: 400 },
      );
    }

    const { full_name, email, phone_number, avatar_url, status } =
      bodyValidation.data;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) {
      updateData.full_name = full_name;
    }

    if (email !== undefined) {
      updateData.email = email;
    }

    if (phone_number !== undefined) {
      updateData.phone_number = phone_number || null;
    }

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url || null;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', validation.data.id);

    if (updateError) {
      console.error(
        '[API] PUT /api/users/:id - Update error:',
        updateError.message,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update user',
          },
        },
        { status: 500 },
      );
    }

    // Fetch updated profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, phone_number, role, avatar_url, status, created_at, updated_at',
      )
      .eq('id', validation.data.id)
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
    console.error('[API] PUT /api/users/:id - Error:', error);
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
 * DELETE /api/users/:id
 * Delete/archive user (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const result = await verifyAdminAccess(supabase);

    if (!result.authorized) {
      return result.response!;
    }

    const { id } = await params;
    const validation = uuidSchema.safeParse({ id });

    if (!validation.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid user ID format',
          },
        },
        { status: 400 },
      );
    }

    // Archive user (soft delete)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', validation.data.id);

    if (updateError) {
      console.error(
        '[API] DELETE /api/users/:id - Error:',
        updateError.message,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete user',
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: { message: 'User archived successfully' },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] DELETE /api/users/:id - Error:', error);
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
