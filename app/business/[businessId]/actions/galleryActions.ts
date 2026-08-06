'use server';

/**
 * Shop gallery — the narrow write path.
 *
 * 🔴 This exists instead of a call to `updateBusinessProfileAction`, which
 * looks like it would do. That action writes `description`, `logo_url`,
 * `banner_url` and `category_id` as `?? null` **unconditionally** — only
 * `interior_images` is conditional — so a gallery page sending
 * `{ shop_name, interior_images }` would silently erase four columns the owner
 * never touched. It also requires `shop_name` (`min(2)`), which a gallery
 * surface has no business resending.
 *
 * Publicly invocable, so it validates the id's shape, proves ownership of THAT
 * shop with the **route segment's** id — never `verifyBusinessOwner()` with no
 * argument, which falls back to whichever shop `.limit(1)` returns and would
 * let a two-shop owner rewrite the wrong gallery — and passes a per-user flood
 * guard, since Server-Action POSTs never reach the proxy's rate limiter and
 * this one amplifies into a storage delete.
 */

import { revalidatePath } from 'next/cache';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import {
  businessGallerySchema,
  businessIdSchema,
} from '@/lib/validation/business';
import {
  businessProfilePath,
  businessShopGalleryPath,
  businessShopPath,
} from '@/config/routeConfig';
import { storagePathsToDelete, toStoragePaths } from '@/lib/utils/storage';
import type { ApiError, ApiResponse } from '@/lib/types';

const BUCKET = 'interior-images';

const RATE_LIMIT = Number(process.env.BUSINESS_ACTION_RATE_LIMIT ?? 30);
const RATE_WINDOW_MS = Number(
  process.env.BUSINESS_ACTION_RATE_WINDOW_MS ?? 60_000,
);

function fail(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}

export async function updateBusinessGalleryAction(
  businessId: string,
  images: string[],
): Promise<ApiResponse<{ interior_images: string[] }>> {
  // BEFORE `verifyBusinessOwner`: that helper reads a falsy id as "no argument"
  // and authorizes some other shop of the caller's.
  if (!businessIdSchema.safeParse(businessId).success) {
    return fail('VALIDATION_ERROR', 'Invalid business id.');
  }

  const parsed = businessGallerySchema.safeParse({ interior_images: images });
  if (!parsed.success) {
    return fail(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message ?? 'Invalid gallery.',
    );
  }

  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized) {
    // Narrowed rather than cast — the error union has a `NextResponse` arm that
    // would otherwise be serialised into an `ApiResponse` body.
    const error: ApiError =
      verify.error && typeof verify.error === 'object' && 'code' in verify.error
        ? (verify.error as ApiError)
        : {
            code: 'UNAUTHORIZED',
            message: 'You do not have access to this shop.',
          };
    return { success: false, error };
  }

  const userId = verify.user?.id;
  if (!userId) {
    return fail('UNAUTHORIZED', 'You do not have access to this shop.');
  }

  const { allowed } = rateLimit(
    `business-gallery-write:${userId}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    return fail(
      'RATE_LIMITED',
      'Too many changes at once — please try again in a moment.',
    );
  }

  // The VERIFIED id, not the client's.
  const verifiedId = verify.business!.id;
  const supabase = await createServerSupabaseClient();

  const { data: current, error: readError } = await supabase
    .from('businesses')
    .select('interior_images')
    .eq('id', verifiedId)
    .single();

  if (readError) {
    console.error('[updateBusinessGalleryAction:read]', readError);
    return fail('DB_ERROR', 'Could not load your gallery. Please try again.');
  }

  // Stored as bucket-relative paths, matching what registration already writes.
  // An absolute URL bakes the Supabase project host into the row, which is the
  // portability bug the seeds were rewritten to fix.
  const nextPaths = toStoragePaths(parsed.data.interior_images, BUCKET);

  const { data: updated, error } = await supabase
    .from('businesses')
    .update({ interior_images: nextPaths })
    .eq('id', verifiedId)
    .select('interior_images')
    .single();

  if (error || !updated) {
    console.error('[updateBusinessGalleryAction:write]', error);
    return fail('DB_ERROR', 'Could not save your gallery. Please try again.');
  }

  // Storage cleanup, after the row is safely updated. Fire-and-forget: an
  // orphaned file is a housekeeping problem, a failed save is the owner's.
  const toDelete = storagePathsToDelete(
    (current?.interior_images as string[] | null) ?? [],
    nextPaths,
    BUCKET,
  );
  if (toDelete.length > 0) {
    await supabase.storage
      .from(BUCKET)
      .remove(toDelete)
      .catch(() => {
        // Orphaned file — acceptable; cleaned up by periodic storage audit.
      });
  }

  // Both surfaces render this array, and the shop page is where the owner came
  // from.
  revalidatePath(businessShopGalleryPath(verifiedId));
  revalidatePath(businessShopPath(verifiedId));
  revalidatePath(businessProfilePath(verifiedId));

  return {
    success: true,
    data: { interior_images: (updated.interior_images as string[]) ?? [] },
  };
}
