/**
 * Admin Category Management Server Actions
 * Used for creating, updating, and deleting categories
 */

'use server';

import { createServerSupabaseClient } from '@/config/server';
import type {
  ApiResponse,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/lib/types';
import {
  createCategorySchema,
  updateCategorySchema,
} from '@/lib/validation/products';
import * as productService from '@/lib/api/products/productService';

// ===== Admin Category Actions =====

/**
 * Create a new category (admin only)
 */
export async function createCategoryAction(
  input: CreateCategoryRequest,
): Promise<ApiResponse<Category>> {
  try {
    // Verify admin access
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Only super admins can create categories',
        },
      };
    }

    // Validate input
    const validation = createCategorySchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.name?.[0] || 'Invalid category data',
        },
      };
    }

    return await productService.createCategory(validation.data);
  } catch (error) {
    console.error('[createCategoryAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create category',
      },
    };
  }
}

/**
 * Update a category (admin only)
 */
export async function updateCategoryAction(
  id: string,
  input: UpdateCategoryRequest,
): Promise<ApiResponse<Category>> {
  try {
    // Verify admin access
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Only super admins can update categories',
        },
      };
    }

    // Validate input
    const validation = updateCategorySchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.name?.[0] || 'Invalid category data',
        },
      };
    }

    return await productService.updateCategory(id, validation.data);
  } catch (error) {
    console.error('[updateCategoryAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update category',
      },
    };
  }
}

/**
 * Delete a category (admin only)
 */
export async function deleteCategoryAction(
  id: string,
): Promise<ApiResponse<null>> {
  try {
    // Verify admin access
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'super_admin';
    if (!isAdmin) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Only super admins can delete categories',
        },
      };
    }

    return await productService.deleteCategory(id);
  } catch (error) {
    console.error('[deleteCategoryAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete category',
      },
    };
  }
}
