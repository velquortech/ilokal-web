import { createServerSupabaseClient } from '@/supabase/server';

/**
 * Get the primary business for a user (owner).
 * Used by the analytics routes (and server-side product service) to resolve a
 * business_id from the authenticated user before any service-role query.
 * Extracted from the deleted lib/api/subscriptions/subscriptionQuery.ts — this
 * was its only function that queried real schema and had live callers.
 */
export async function getUserBusiness(
  userId: string,
): Promise<{ data: { id: string } } | { error: string }> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .is('archived_at', null)
    .limit(1)
    .single();

  if (error) {
    return { error: 'Business not found for user' };
  }

  return { data };
}
