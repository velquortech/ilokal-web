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
import { extractStoragePath } from '@/lib/utils/storage';

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

    const { shop_name, description, logo_url, banner_url, category_id, interior_images } =
      validation.data;

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
      updatePayload.interior_images = interior_images ?? [];
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
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error?.message ?? 'Failed to update business profile',
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

    // Delete gallery images that were removed from the list
    if (interior_images !== undefined && current?.interior_images?.length) {
      const newSet = new Set(interior_images ?? []);
      const toDelete = (current.interior_images as string[]).filter(
        (url) => !newSet.has(url),
      );
      if (toDelete.length > 0) {
        const paths = toDelete
          .map((url) => extractStoragePath(url, 'interior-images'))
          .filter((p): p is string => p !== null);
        if (paths.length > 0) {
          supabase.storage
            .from('interior-images')
            .remove(paths)
            .catch(() => {});
        }
      }
    }

    revalidatePath(businessProfilePath(businessId));

    return { success: true, data: updated as BusinessProfileData };
  } catch (err) {
    console.error('[updateBusinessProfileAction]', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update business profile' },
    };
  }
}
