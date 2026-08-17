'use server';

import { revalidatePath } from 'next/cache';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';
import type { ApiResponse, ApiError, BusinessProfileData } from '@/lib/types';
import { logActionError } from '@/lib/utils/captureError';
import { formatErrorForLog } from '@/lib/utils/describeDbError';
import {
  updateBusinessProfileSchema,
  type UpdateBusinessProfileInput,
} from '@/lib/validation/business';
import {
  businessProfilePath,
  businessShopGalleryPath,
} from '@/config/routeConfig';
import {
  GALLERY_BUCKET,
  MAX_GALLERY_IMAGES,
  foreignGalleryPaths,
} from '@/config/gallery';
import {
  extractStoragePath,
  storagePathsToDelete,
  toStoragePaths,
} from '@/lib/utils/storage';

export async function updateBusinessProfileAction(
  businessId: string,
  data: UpdateBusinessProfileInput,
): Promise<ApiResponse<BusinessProfileData>> {
  try {
    const verify = await verifyBusinessOwner(businessId);
    if (!verify.authorized) {
      return { success: false, error: verify.error as ApiError };
    }

    const validation = updateBusinessProfileSchema.safeParse(data);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError?.message ?? 'Invalid input',
        },
      };
    }

    const {
      shop_name,
      description,
      logo_url,
      banner_url,
      category_id,
      interior_images,
    } = validation.data;

    // The VERIFIED id, never the caller's string.
    const verifiedId = verify.business?.id ?? businessId;
    const supabase = await createServerSupabaseClient();

    // Fetch current stored values so we know what to delete from storage
    const { data: current } = await supabase
      .from('businesses')
      .select('logo_url, interior_images')
      .eq('id', verifiedId)
      .single();

    const currentGallery = toStoragePaths(
      (current?.interior_images as string[] | null) ?? [],
      GALLERY_BUCKET,
    );

    // Build the update payload — only include interior_images when caller provided it
    const updatePayload: Record<string, unknown> = {
      shop_name,
      description: description ?? null,
      logo_url: logo_url ?? null,
      banner_url: banner_url ?? null,
      category_id: category_id ?? null,
      updated_at: new Date().toISOString(),
    };
    if (interior_images !== undefined) {
      // Normalised to bucket-relative paths, matching what registration and the
      // gallery action write. Leaving absolute URLs here would keep the column
      // holding TWO representations of the same file — the split that made the
      // delete diff below destroy galleries — and bakes the Supabase project
      // host into the row.
      const nextGallery = toStoragePaths(interior_images ?? [], GALLERY_BUCKET);

      // 🔴 The SAME guard the gallery action applies. This is the other writer
      // of this column, and without it the storage-key injection closed there is
      // simply reachable through this form instead: a key naming another shop's
      // folder lands in this row, renders publicly, and is handed to
      // `storage.remove()` on the next save.
      const foreign = foreignGalleryPaths(
        nextGallery,
        currentGallery,
        verifiedId,
      );
      if (foreign.length > 0) {
        console.error('[updateBusinessProfileAction:foreign]', {
          verifiedId,
          foreign,
        });
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'One of those photos does not belong to this shop.',
          },
        };
      }

      // Growth-only, for the reason the gallery action documents: this form
      // resubmits the whole array, so a flat cap would stop a shop that
      // registered with eleven photos from editing its NAME.
      if (
        nextGallery.length > MAX_GALLERY_IMAGES &&
        nextGallery.length > currentGallery.length
      ) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `You can have up to ${MAX_GALLERY_IMAGES} photos.`,
          },
        };
      }

      updatePayload.interior_images = nextGallery;
    }

    const { data: updated, error } = await supabase
      .from('businesses')
      .update(updatePayload)
      .eq('id', verifiedId)
      .select(
        'id, shop_name, description, logo_url, banner_url, category_id, interior_images, status, updated_at',
      )
      .single();

    if (error || !updated) {
      // Never the driver's own message: it names tables, columns and
      // constraints. Logged server-side, generic to the client.
      logActionError('updateBusinessProfileAction:write', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Failed to update business profile',
        },
      };
    }

    // Storage cleanup, after the DB update succeeded. Awaited, and the resolved
    // error checked: `storage.remove()` RESOLVES with `{ error }` rather than
    // throwing, so the `.catch()` these calls used to carry could never fire —
    // and an un-awaited promise in a Server Action can be cut off before it
    // runs at all. An orphaned file is housekeeping; it is logged, never
    // surfaced.

    // Delete old logo when it was replaced
    if (
      current?.logo_url &&
      logo_url !== undefined &&
      current.logo_url !== logo_url
    ) {
      const oldPath = extractStoragePath(current.logo_url, 'business-logos');
      if (oldPath) {
        const { error: logoError } = await supabase.storage
          .from('business-logos')
          .remove([oldPath]);
        if (logoError) {
          logActionError('updateBusinessProfileAction:logoCleanup', logoError);
        }
      }
    }

    // Delete gallery images that were removed from the list.
    //
    // 🔴 This compared the two arrays DIRECTLY, and the column holds two
    // representations of the same file: registration stores the raw path
    // `storage.upload()` returns, the upload route and this action store the
    // absolute public URL, and the read layer resolves paths to URLs on the way
    // out. So the client always sent URLs, none of them matched the raw paths
    // in the row, and the first profile save by any owner who registered
    // through the wizard deleted their ENTIRE gallery out of the bucket while
    // the row kept pointing at it. Both sides are normalised to a path now.
    if (interior_images !== undefined && currentGallery.length > 0) {
      const paths = storagePathsToDelete(
        currentGallery,
        (updatePayload.interior_images as string[] | undefined) ?? [],
        GALLERY_BUCKET,
      );
      if (paths.length > 0) {
        const { error: galleryError } = await supabase.storage
          .from(GALLERY_BUCKET)
          .remove(paths);
        if (galleryError) {
          console.error(
            '[updateBusinessProfileAction:galleryCleanup]',
            formatErrorForLog(galleryError),
          );
        }
      }
    }

    // Both surfaces render this column now.
    revalidatePath(businessProfilePath(verifiedId));
    revalidatePath(businessShopGalleryPath(verifiedId));

    return { success: true, data: updated as BusinessProfileData };
  } catch (err) {
    logActionError('updateBusinessProfileAction', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update business profile',
      },
    };
  }
}
