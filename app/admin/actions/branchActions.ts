'use server';

import { revalidatePath } from 'next/cache';
import { verifyCurrentUserIsAdmin } from '@/lib/api/admin/adminActionHelpers';
import { createServerSupabaseClient } from '@/supabase/server';
import type { ApiResponse, Branch } from '@/lib/types';

export async function getPendingBranchesAction(): Promise<
  ApiResponse<{ branches: (Branch & { business_name: string })[] }>
> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: error ?? 'Unauthorized' },
      };
    }

    const supabase = await createServerSupabaseClient();

    const { data, error: dbError } = await supabase
      .from('branches')
      .select('*, businesses(shop_name)')
      .eq('status', 'pending_review')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (dbError) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: dbError.message },
      };
    }

    const branches = (data ?? []).map((b) => ({
      ...(b as Branch),
      business_name:
        (b as { businesses: { shop_name: string } | null }).businesses
          ?.shop_name ?? '—',
    }));

    return { success: true, data: { branches } };
  } catch {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch pending branches',
      },
    };
  }
}

export async function approveBranchAction(
  branchId: string,
): Promise<ApiResponse<null>> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: error ?? 'Unauthorized' },
      };
    }

    const supabase = await createServerSupabaseClient();

    const { error: dbError } = await supabase
      .from('branches')
      .update({
        status: 'active',
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', branchId);

    if (dbError) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: dbError.message },
      };
    }

    revalidatePath('/admin/branches');
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to approve branch' },
    };
  }
}

export async function rejectBranchAction(
  branchId: string,
  reason: string,
): Promise<ApiResponse<null>> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: error ?? 'Unauthorized' },
      };
    }

    const supabase = await createServerSupabaseClient();

    const { error: dbError } = await supabase
      .from('branches')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', branchId);

    if (dbError) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: dbError.message },
      };
    }

    revalidatePath('/admin/branches');
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reject branch' },
    };
  }
}

export async function getBranchDocumentsAction(
  branchId: string,
): Promise<
  ApiResponse<{ documents: { document_type: string; file_url: string }[] }>
> {
  try {
    const { authorized, error } = await verifyCurrentUserIsAdmin();
    if (!authorized) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: error ?? 'Unauthorized' },
      };
    }

    const supabase = await createServerSupabaseClient();

    const { data, error: dbError } = await supabase
      .from('branch_documents')
      .select('document_type, file_url')
      .eq('branch_id', branchId);

    if (dbError) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: dbError.message },
      };
    }

    return { success: true, data: { documents: data ?? [] } };
  } catch {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch documents' },
    };
  }
}
