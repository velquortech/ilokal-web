'use server';

import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import type {
  ApiResponse,
  ApiError,
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

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    return await branchService.createBranch(
      verify.business!.id,
      validation.data,
    );
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

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const { branch, error }: { branch?: Branch; error?: string } = await (
      await import('@/lib/api/branches/branchQuery')
    ).getBranchById(id);
    if (error || !branch) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Branch not found' },
      };
    }

    if (branch.business_id !== verify.business!.id) {
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
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const { branch, error }: { branch?: Branch; error?: string } = await (
      await import('@/lib/api/branches/branchQuery')
    ).getBranchById(id);
    if (error || !branch) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Branch not found' },
      };
    }

    if (branch.business_id !== verify.business!.id) {
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
