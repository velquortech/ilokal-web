import { createServerSupabaseClient } from '@/supabase/server';

/**
 * Simple idempotency helper using `idempotency_keys` table if present.
 * Attempts to insert a key and returns true if insertion succeeded (first time),
 * or false if key already exists. Falls back to `false` on errors.
 */
export async function claimIdempotencyKey(key: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const now = new Date().toISOString();

    const { error } = await supabase.from('idempotency_keys').insert({
      id: key,
      created_at: now,
    });

    if (error) {
      // If insert fails due to duplicate key, treat as already claimed
      // Supabase will return an error message; we conservatively return false
      return false;
    }

    return true;
  } catch (err) {
    console.warn(
      '[claimIdempotencyKey] fallback false',
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

export async function releaseIdempotencyKey(key: string): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from('idempotency_keys').delete().eq('id', key);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // noop
  }
}

export default { claimIdempotencyKey, releaseIdempotencyKey };
