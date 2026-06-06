'use server';

import { createServerSupabaseClient } from '@/supabase/server';

export async function enrollMFAAction(): Promise<{
  factorId: string;
  qrCode: string;
  secret: string;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
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
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function verifyMFAEnrollmentAction(
  factorId: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
