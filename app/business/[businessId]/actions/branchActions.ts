'use server';

import { revalidatePath } from 'next/cache';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';
import type {
  ApiResponse,
  ApiError,
  Branch,
  BranchStats,
  BranchFilters,
  PaginatedBranchesResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '@/lib/types';
import {
  createBranchSchema,
  updateBranchSchema,
} from '@/lib/validation/branches';
import * as branchService from '@/lib/api/branches/branchService';
import * as branchQuery from '@/lib/api/branches/branchQuery';

const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_DOC_SIZE = 2 * 1024 * 1024; // 2 MB

export async function uploadBranchDocumentAction(
  formData: FormData,
): Promise<ApiResponse<{ url: string }>> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized) {
      return { success: false, error: verify.error as ApiError };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' },
      };
    }

    if (file.size > MAX_DOC_SIZE) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File must be less than 2 MB',
        },
      };
    }

    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only PDF, Word documents, or images are allowed',
        },
      };
    }

    const supabase = await createServerSupabaseClient();
    const businessId = verify.business!.id;
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const filePath = `${businessId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('branch-documents')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      return {
        success: false,
        error: { code: 'UPLOAD_ERROR', message: uploadError.message },
      };
    }

    const { data: signed } = await supabase.storage
      .from('branch-documents')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1-year signed URL for admin review

    return { success: true, data: { url: signed?.signedUrl ?? filePath } };
  } catch (error) {
    console.error('[uploadBranchDocumentAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to upload document' },
    };
  }
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function uploadBranchImageAction(
  formData: FormData,
): Promise<ApiResponse<{ url: string }>> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized) {
      return { success: false, error: verify.error as ApiError };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' },
      };
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Image must be less than 2 MB',
        },
      };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only JPEG, PNG, GIF, or WebP images are allowed',
        },
      };
    }

    const supabase = await createServerSupabaseClient();
    const businessId = verify.business!.id;
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const filePath = `${businessId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('branch-images')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      return {
        success: false,
        error: { code: 'UPLOAD_ERROR', message: uploadError.message },
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('branch-images').getPublicUrl(filePath);

    return { success: true, data: { url: publicUrl } };
  } catch (error) {
    console.error('[uploadBranchImageAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to upload image' },
    };
  }
}

// ===== Branch Read Actions =====

export async function getBusinessBranchesAction(
  filters: Omit<BranchFilters, 'latitude' | 'longitude' | 'radius_km'> = {},
): Promise<ApiResponse<PaginatedBranchesResponse>> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const result = await branchQuery.getBranchesByBusinessId(
      verify.business!.id,
      { ...filters, status: filters.status ?? 'all' },
    );

    if ('error' in result && result.error) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: result.error },
      };
    }

    return { success: true, data: result as PaginatedBranchesResponse };
  } catch (error) {
    console.error('[getBusinessBranchesAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch branches' },
    };
  }
}

export async function getBusinessBranchStatsAction(): Promise<
  ApiResponse<BranchStats>
> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const result = await branchQuery.getBranchesByBusinessId(
      verify.business!.id,
      { per_page: 1000 },
    );

    if ('error' in result && result.error) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: result.error },
      };
    }

    const branches = result.branches as Branch[];
    const withLocation = branches.filter((b) => b.location !== null).length;

    return {
      success: true,
      data: {
        total: result.total,
        with_location: withLocation,
        without_location: result.total - withLocation,
      },
    };
  } catch (error) {
    console.error('[getBusinessBranchStatsAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch branch stats',
      },
    };
  }
}

export async function getBusinessBranchByIdAction(
  branchId: string,
): Promise<ApiResponse<Branch>> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const { branch, error } = await branchQuery.getBranchById(branchId);
    if (error || !branch) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Branch not found' },
      };
    }

    if (branch.business_id !== verify.business!.id) {
      return {
        success: false,
        error: { code: 'AUTHORIZATION_ERROR', message: 'Access denied' },
      };
    }

    return { success: true, data: branch };
  } catch (error) {
    console.error('[getBusinessBranchByIdAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch branch' },
    };
  }
}

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

    const result = await branchService.createBranch(
      verify.business!.id,
      validation.data,
    );
    if (result.success)
      revalidatePath(`/business/${verify.business!.id}/branches`);
    return result;
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

    const { branch, error } = await branchQuery.getBranchById(id);
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

    const res = await branchService.updateBranch(id, validation.data);
    if (res.success)
      revalidatePath(`/business/${verify.business!.id}/branches`);
    return res;
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

    const { branch, error } = await branchQuery.getBranchById(id);
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

    const result = await branchService.deleteBranch(id);
    if (result.success)
      revalidatePath(`/business/${verify.business!.id}/branches`);
    return result;
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
