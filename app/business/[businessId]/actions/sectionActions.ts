'use server';

/**
 * Owner-facing section mutations.
 *
 * Every export here is a publicly invocable endpoint, so each one re-verifies
 * ownership rather than trusting the `businessId` the client sent — and then
 * passes the VERIFIED id down, never the caller's. RLS would refuse a
 * cross-shop write anyway; this makes the refusal a clean 403 instead of a
 * policy denial surfacing as an internal error.
 */

import { revalidatePath } from 'next/cache';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import {
  businessProductCataloguesPath,
  businessPath,
} from '@/config/routeConfig';
import {
  createSectionSchema,
  updateSectionSchema,
  reorderSectionsSchema,
  sectionIdSchema,
} from '@/lib/validation/sections';
import * as sectionService from '@/lib/api/sections/sectionService';
import type { ApiError, ApiResponse, ProductSection } from '@/lib/types';

const UNAUTHORIZED: ApiError = {
  code: 'UNAUTHORIZED',
  message: 'You do not have access to this shop.',
};

const INVALID_SECTION: ApiError = {
  code: 'VALIDATION_ERROR',
  message: 'That section no longer exists.',
};

/**
 * A malformed id would otherwise reach Postgres as a 22P02 and map to the
 * generic INTERNAL_ERROR — a refusal dressed as a server fault.
 */
function validSectionId(sectionId: string): boolean {
  return sectionIdSchema.safeParse(sectionId).success;
}

async function ownerOf(
  businessId: string,
): Promise<{ id: string } | { error: ApiError }> {
  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized || !verify.business?.id) {
    // `verify.error` can be a NextResponse (the helper is shared with route
    // handlers); a Server Action must never try to serialize one back.
    const err = verify.error;
    const usable =
      err && typeof err === 'object' && 'code' in err
        ? (err as ApiError)
        : UNAUTHORIZED;
    return { error: usable };
  }
  return { id: verify.business.id };
}

/** The catalogue page lists sections; the shop page groups by them. */
function revalidateSectionSurfaces(businessId: string) {
  revalidatePath(businessProductCataloguesPath(businessId));
  revalidatePath(businessPath(businessId, 'shop'));
}

export async function createSectionAction(
  businessId: string,
  name: string,
): Promise<ApiResponse<ProductSection>> {
  const owner = await ownerOf(businessId);
  if ('error' in owner) return { success: false, error: owner.error };

  const parsed = createSectionSchema.safeParse({ name });
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid section name',
      },
    };
  }

  const result = await sectionService.createSection(owner.id, parsed.data.name);
  if (result.success) revalidateSectionSurfaces(owner.id);
  return result;
}

export async function renameSectionAction(
  businessId: string,
  sectionId: string,
  name: string,
): Promise<ApiResponse<ProductSection>> {
  const owner = await ownerOf(businessId);
  if ('error' in owner) return { success: false, error: owner.error };
  if (!validSectionId(sectionId))
    return { success: false, error: INVALID_SECTION };

  const parsed = updateSectionSchema.safeParse({ name });
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'Invalid section name',
      },
    };
  }

  const result = await sectionService.renameSection(
    owner.id,
    sectionId,
    parsed.data.name!,
  );
  if (result.success) revalidateSectionSurfaces(owner.id);
  return result;
}

export async function archiveSectionAction(
  businessId: string,
  sectionId: string,
): Promise<ApiResponse<{ id: string }>> {
  const owner = await ownerOf(businessId);
  if ('error' in owner) return { success: false, error: owner.error };
  if (!validSectionId(sectionId))
    return { success: false, error: INVALID_SECTION };

  const result = await sectionService.archiveSection(owner.id, sectionId);
  if (result.success) revalidateSectionSurfaces(owner.id);
  return result;
}

export async function reorderSectionsAction(
  businessId: string,
  sectionIds: string[],
): Promise<ApiResponse<{ updated: number }>> {
  const owner = await ownerOf(businessId);
  if ('error' in owner) return { success: false, error: owner.error };

  const parsed = reorderSectionsSchema.safeParse({ section_ids: sectionIds });
  if (!parsed.success) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid section order' },
    };
  }

  const result = await sectionService.reorderSections(
    owner.id,
    parsed.data.section_ids,
  );
  if (result.success) revalidateSectionSurfaces(owner.id);
  return result;
}
