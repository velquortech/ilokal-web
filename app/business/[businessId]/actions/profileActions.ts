'use server';

import { revalidatePath } from 'next/cache';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';
import type { ApiResponse, ApiError, BusinessProfileData } from '@/lib/types';
import {
  updateBusinessProfileSchema,
  type UpdateBusinessProfileInput,
} from '@/lib/validation/business';
import { businessProfilePath } from '@/config/routeConfig';
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

    const supabase = await createServerSupabaseClient();

    // Fetch current stored values so we know what to delete from storage
    const { data: current } = await supabase
      .from('businesses')
      .select('logo_url, interior_images')
      .eq('id', businessId)
      .single();

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
      updatePayload.interior_images = toStoragePaths(
        interior_images ?? [],
        'interior-images',
      );
    }

    const { data: updated, error } = await supabase
      .from('businesses')
      .update(updatePayload)
      .eq('id', businessId)
      .select(
        'id, shop_name, description, logo_url, banner_url, category_id, interior_images, status, updated_at',
      )
      .single();

    if (error || !updated) {
      // Never the driver's own message: it names tables, columns and
      // constraints. Logged server-side, generic to the client.
      console.error('[updateBusinessProfileAction:write]', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: 'Failed to update business profile',
        },
      };
    }

    // Storage cleanup — fire-and-forget after the DB update succeeded

    // Delete old logo when it was replaced
    if (
      current?.logo_url &&
      logo_url !== undefined &&
      current.logo_url !== logo_url
    ) {
      const oldPath = extractStoragePath(current.logo_url, 'business-logos');
      if (oldPath) {
        supabase.storage
          .from('business-logos')
          .remove([oldPath])
          .catch(() => {
            // Orphaned file — acceptable; cleaned up by periodic storage audit
          });
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
    if (interior_images !== undefined && current?.interior_images?.length) {
      const paths = storagePathsToDelete(
        current.interior_images as string[],
        interior_images ?? [],
        'interior-images',
      );
      if (paths.length > 0) {
        supabase.storage
          .from('interior-images')
          .remove(paths)
          .catch(() => {});
      }
    }

    revalidatePath(businessProfilePath(businessId));

    return { success: true, data: updated as BusinessProfileData };
  } catch (err) {
    console.error('[updateBusinessProfileAction]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update business profile',
      },
    };
  }
}
