'use server';

/**
 * Review moderation — admin actions.
 *
 * Every rule lives in the `moderate_business_rating` RPC (20261013100000): it
 * re-checks `is_admin()` itself and moves the row between `business_ratings`
 * and `business_rating_moderation`. It must be called with the admin's own
 * session client — under the service role `auth.uid()` is null and the RPC
 * answers FORBIDDEN.
 *
 * The admin check is still re-derived here: the `[adminId]` layout guards
 * navigation, not a POST to this endpoint.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { createServerSupabaseClient } from '@/supabase/server';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import { adminReviewsPath } from '@/config/routeConfig';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

const inputSchema = z.object({
  ratingId: z.guid('Invalid review id'),
  action: z.enum(['hide', 'remove', 'restore']),
  reason: z.string().trim().max(200).optional(),
});

export type ModerationAction = z.infer<typeof inputSchema>['action'];

export interface ModerateReviewResult {
  ok: boolean;
  error?: string;
}

const RATE_LIMIT = Number(process.env.ADMIN_ACTION_RATE_LIMIT ?? 20);
const RATE_WINDOW_MS = Number(
  process.env.ADMIN_ACTION_RATE_WINDOW_MS ?? 60_000,
);

export async function moderateReviewAction(
  ratingId: string,
  action: ModerationAction,
  reason?: string,
): Promise<ModerateReviewResult> {
  const parsed = inputSchema.safeParse({ ratingId, action, reason });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return { ok: false, error: 'Only admins can moderate reviews' };
  }
  const { allowed } = rateLimit(
    `admin:review-moderation:${user.id}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    return {
      ok: false,
      error: 'Too many actions — wait a minute and try again.',
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('moderate_business_rating', {
    p_rating: parsed.data.ratingId,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason || `admin:${parsed.data.action}`,
  });

  if (error) {
    console.error('[moderateReview]', formatErrorForLog(error));
    return { ok: false, error: error.hint || 'Could not update the review.' };
  }
  if (data !== true) {
    // Already moved by someone else (or by the auto-hide) since the page loaded.
    return {
      ok: false,
      error: 'That review has already changed — refresh to see it.',
    };
  }

  revalidatePath(adminReviewsPath(user.id));
  return { ok: true };
}
