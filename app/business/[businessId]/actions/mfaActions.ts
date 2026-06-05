'use server';

import { createServerSupabaseClient } from '@/supabase/server';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import type { ApiResponse, ApiError, MFAFactor } from '@/lib/types';

export async function listMFAFactorsAction(
  businessId: string,
): Promise<ApiResponse<MFAFactor[]>> {
  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized)
    return { success: false, error: verify.error as ApiError };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) {
    return {
      success: false,
      error: { code: 'MFA_ERROR', message: error.message },
    };
  }

  const factors = (data.totp ?? []).map((f) => ({
    id: f.id,
    friendly_name: f.friendly_name ?? null,
    factor_type: 'totp' as const,
    status: f.status as 'verified' | 'unverified',
    created_at: f.created_at,
    updated_at: f.updated_at,
  }));

  return { success: true, data: factors };
}

export async function unenrollMFAAction(
  businessId: string,
  factorId: string,
): Promise<ApiResponse<null>> {
  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized)
    return { success: false, error: verify.error as ApiError };

  if (!factorId) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'factorId is required' },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return {
      success: false,
      error: { code: 'MFA_ERROR', message: error.message },
    };
  }

  return { success: true, data: null };
}
