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

    // PostGIS GEOGRAPHY columns require WKT format: POINT(longitude latitude)
    const location =
      input.latitude !== undefined && input.longitude !== undefined
        ? `POINT(${input.longitude} ${input.latitude})`
        : null;

    const { data, error } = await supabase
      .from('branches')
      .insert({
        business_id: businessId,
        name: input.name,
        address: input.address,
        location,
        phone: input.phone ?? null,
        email: input.email ?? null,
        description: input.description ?? null,
        status: input.status ?? 'active',
        cover_image_url: input.cover_image_url ?? null,
        gallery_images: input.gallery_images ?? [],
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

    const branch = data as Branch;

    // Insert branch documents if provided
    const docs: {
      branch_id: string;
      document_type: string;
      file_url: string;
    }[] = [];
    if (input.business_permit_url) {
      docs.push({
        branch_id: branch.id,
        document_type: 'business_permit',
        file_url: input.business_permit_url,
      });
    }
    if (input.other_document_url) {
      docs.push({
        branch_id: branch.id,
        document_type: 'other_document',
        file_url: input.other_document_url,
      });
    }
    if (docs.length > 0) {
      await supabase.from('branch_documents').insert(docs);
    }

    return {
      success: true,
      data: branch,
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

    const updateData: Partial<{
      name: string;
      address: string;
      location: string | null;
      phone: string | null;
      email: string | null;
      description: string | null;
      cover_image_url: string | null;
      gallery_images: string[];
      updated_at: string;
    }> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name) updateData.name = input.name;
    if (input.address) updateData.address = input.address;

    if (input.latitude !== undefined && input.longitude !== undefined) {
      // PostGIS GEOGRAPHY columns require WKT format: POINT(longitude latitude)
      updateData.location = `POINT(${input.longitude} ${input.latitude})`;
    }

    if ('phone' in input) updateData.phone = input.phone ?? null;
    if ('email' in input) updateData.email = input.email ?? null;
    if ('description' in input)
      updateData.description = input.description ?? null;
    if ('cover_image_url' in input)
      updateData.cover_image_url = input.cover_image_url ?? null;
    if ('gallery_images' in input)
      updateData.gallery_images = input.gallery_images ?? [];

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
