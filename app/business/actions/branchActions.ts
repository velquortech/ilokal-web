'use server';

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  ApiResponse,
  Branch,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '@/lib/types';
import {
  createBranchSchema,
  updateBranchSchema,
} from '@/lib/validation/branches';
import * as branchService from '@/lib/api/branches/branchService';

// ===== Branch Management Actions =====

/**
 * Create a new branch for the user's business
 */
export async function createBranchAction(
  input: CreateBranchRequest,
): Promise<ApiResponse<Branch>> {
  try {
    // Validate input
    const validation = createBranchSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.name?.[0] || 'Invalid branch data',
        },
      };
    }

    // Get current user's business
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

    // Get user's business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have a business',
        },
      };
    }

    return await branchService.createBranch(business.id, validation.data);
  } catch (error) {
    console.error('[createBranchAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create branch',
      },
    };
  }
}

/**
 * Update a branch
 */
export async function updateBranchAction(
  id: string,
  input: UpdateBranchRequest,
): Promise<ApiResponse<Branch>> {
  try {
    // Validate input
    const validation = updateBranchSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.name?.[0] || 'Invalid branch data',
        },
      };
    }

    // Get current user's business
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

    // Verify user owns the branch's business
    const { data: branch } = await supabase
      .from('branches')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!branch) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Branch not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', branch.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to update this branch',
        },
      };
    }

    return await branchService.updateBranch(id, validation.data);
  } catch (error) {
    console.error('[updateBranchAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update branch',
      },
    };
  }
}

/**
 * Delete a branch
 */
export async function deleteBranchAction(
  id: string,
): Promise<ApiResponse<null>> {
  try {
    // Get current user's business
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

    // Verify user owns the branch's business
    const { data: branch } = await supabase
      .from('branches')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!branch) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Branch not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', branch.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to delete this branch',
        },
      };
    }

    return await branchService.deleteBranch(id);
  } catch (error) {
    console.error('[deleteBranchAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete branch',
      },
    };
  }
}
