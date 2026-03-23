/**
 * Branch Service Layer
 * Business logic for branch management
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  Branch,
  ApiResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '@/lib/types';
import * as branchQuery from './branchQuery';

// ===== Branch Service =====

/**
 * Create a new branch for a business
 */
export async function createBranch(
  businessId: string,
  input: CreateBranchRequest,
): Promise<ApiResponse<Branch>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Convert address + coordinates to PostGIS format if provided
    let location = null;
    if (input.latitude !== undefined && input.longitude !== undefined) {
      location = {
        type: 'Point',
        coordinates: [input.longitude, input.latitude], // [lon, lat]
      };
    }

    const { data, error } = await supabase
      .from('branches')
      .insert({
        business_id: businessId,
        name: input.name,
        address: input.address,
        location,
      })
      .select()
      .single();

    if (error) {
      console.error('[createBranch] Insert error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create branch',
        },
      };
    }

    return {
      success: true,
      data: data as Branch,
    };
  } catch (err) {
    console.error('[createBranch]', err);
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
export async function updateBranch(
  id: string,
  input: UpdateBranchRequest,
): Promise<ApiResponse<Branch>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if branch exists
    const exists = await branchQuery.branchExists(id);
    if (!exists) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Branch not found',
        },
      };
    }

    // Prepare update data
    const updateData: Partial<{
      name: string;
      address: string;
      location: {
        type: string;
        coordinates: [number, number];
      } | null;
      updated_at: string;
    }> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name) updateData.name = input.name;
    if (input.address) updateData.address = input.address;

    if (input.latitude !== undefined && input.longitude !== undefined) {
      updateData.location = {
        type: 'Point',
        coordinates: [input.longitude, input.latitude],
      };
    }

    const { data, error } = await supabase
      .from('branches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[updateBranch] Update error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update branch',
        },
      };
    }

    return {
      success: true,
      data: data as Branch,
    };
  } catch (err) {
    console.error('[updateBranch]', err);
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
 * Soft delete a branch
 */
export async function deleteBranch(id: string): Promise<ApiResponse<null>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if branch exists
    const exists = await branchQuery.branchExists(id);
    if (!exists) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Branch not found',
        },
      };
    }

    const { error } = await supabase
      .from('branches')
      .update({
        archived_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[deleteBranch] Update error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete branch',
        },
      };
    }

    return {
      success: true,
      data: null,
    };
  } catch (err) {
    console.error('[deleteBranch]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete branch',
      },
    };
  }
}
