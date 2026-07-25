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

/**
 * GoTrue returns `totp.qr_code` as RAW SVG markup (`<?xml …?><svg …>`), NOT a
 * URL — see the auth-js type docs ("convert it to a URL by prepending
 * `data:image/svg+xml;utf-8,`"). Handing the raw markup to <img>/next/image
 * makes the browser resolve it as a RELATIVE PATH, so the QR request hits the
 * app and comes back as the 404 page. Base64 (not `utf-8,`) because the markup
 * contains `#`, `<`, `"` and newlines, which are not valid unescaped in a data
 * URL. Already-encoded values pass through untouched.
 */
function toQrDataUrl(qrCode: string): string {
  if (!qrCode || qrCode.startsWith('data:')) return qrCode;
  return `data:image/svg+xml;base64,${Buffer.from(qrCode, 'utf-8').toString('base64')}`;
}

export async function enrollMFAAction(): Promise<{
  factorId: string;
  qrCode: string;
  secret: string;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      factorId: '',
      qrCode: '',
      secret: '',
      error: 'You must be signed in to enable two-factor authentication',
    };
  }

  // Clean up orphaned UNVERIFIED TOTP factors before enrolling. An abandoned
  // or crashed enrollment leaves an unverified factor behind, and GoTrue then
  // rejects every new enrollment with the same friendly name (422 "already
  // exists") — while the orphan is invisible to the settings list, because
  // listFactors() only surfaces verified factors in `data.totp` (unverified
  // ones live only in `data.all`). Verified factors are never touched.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  const staleFactors = (existing?.all ?? []).filter(
    (f) => f.factor_type === 'totp' && f.status !== 'verified',
  );
  for (const stale of staleFactors) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: stale.id,
    });
    if (unenrollError) {
      console.error(
        '[enrollMFAAction] Failed to clean up stale factor:',
        unenrollError.message,
      );
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'iLokal',
    friendlyName: 'Authenticator App',
  });

  if (error || !data) {
    return {
      factorId: '',
      qrCode: '',
      secret: '',
      error: error?.message ?? 'Failed to start enrollment',
    };
  }

  return {
    factorId: data.id,
    qrCode: toQrDataUrl(data.totp.qr_code),
    secret: data.totp.secret,
  };
}

export async function verifyMFAEnrollmentAction(
  factorId: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      error: 'You must be signed in to enable two-factor authentication',
    };
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
