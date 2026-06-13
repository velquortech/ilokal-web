'use server';

import { createServerSupabaseClient } from '@/supabase/server';

export async function checkMFARequiredAction(): Promise<{
  required: boolean;
  factorId: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalData?.nextLevel !== 'aal2' || aalData.currentLevel === 'aal2') {
    return { required: false, factorId: null };
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const totpFactor = factorsData?.totp?.find((f) => f.status === 'verified');

  return {
    required: !!totpFactor,
    factorId: totpFactor?.id ?? null,
  };
}

export async function verifyMFALoginAction(
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
