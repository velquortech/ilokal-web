/**
 * Business Data Queries
 *
 * Direct Supabase queries for business operations.
 * Handles all database interactions with proper error handling.
 */

import { createServerSupabaseClient } from '@/supabase/server';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { logActionError } from '@/lib/utils/captureError';
import { isDynamicUsageError } from '@/lib/utils/dynamicUsage';
import { publicStorageUrl } from '@/lib/utils/storage';
import {
  Business,
  AdminBusiness,
  BusinessFilters,
  BusinessProfileData,
} from '@/lib/types/business';

// ============================================================================
// FETCH OPERATIONS
// ============================================================================

/**
 * Get business by ID with owner information
 */
export async function getBusinessById(
  businessId: string,
): Promise<{ business: AdminBusiness | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(
        `
        *,
        owner:owner_id (
          id,
          email,
          full_name,
          phone_number,
          role,
          status,
          avatar_url,
          created_at,
          updated_at
        )
      `,
      )
      .eq('id', businessId)
      .single();

    if (error) {
      return { business: null, error: 'Failed to fetch business' };
    }

    return {
      business: data as AdminBusiness,
      error: null,
    };
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;
    logActionError('getBusinessById', err);
    return {
      business: null,
      error: 'Failed to fetch business',
    };
  }
}

/**
 * Get paginated list of businesses with filters
 */
export async function getBusinessesPaginated(
  filters: Partial<BusinessFilters>,
): Promise<{
  data: AdminBusiness[];
  total: number;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const offset = (page - 1) * pageSize;

    // Build query with filters
    let query = supabase.from('businesses').select(
      `
      *,
      owner:owner_id (
        id,
        email,
        full_name,
        phone_number,
        role,
        status,
        avatar_url,
        created_at,
        updated_at
      )
    `,
      { count: 'exact' },
    );

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Apply search filter. Column is `shop_name` (renamed from `name` in
    // 20260418094212). We filter the base table only — `owner` is an embedded
    // foreign relation, not a JSONB column, so it can't be OR'd here (doing so
    // makes PostgREST error and return zero rows).
    if (filters.search) {
      query = query.ilike('shop_name', `%${filters.search}%`);
    }

    // Apply sorting
    const sortField =
      filters.sortBy === 'name'
        ? 'shop_name'
        : filters.sortBy === 'updated'
          ? 'updated_at'
          : 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? true : false; // ascending param

    query = query.order(sortField, { ascending: sortOrder });

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return { data: [], total: 0, error: 'Failed to fetch businesses' };
    }

    return {
      data: data as AdminBusiness[],
      total: count || 0,
      error: null as string | null,
    };
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;
    logActionError('getBusinessesPaginated', err);
    return {
      data: [],
      total: 0,
      error: 'Failed to fetch businesses',
    };
  }
}

/**
 * Get all businesses by status
 */
export async function getBusinessesByStatus(
  status: 'pending' | 'verified' | 'suspended' | 'rejected',
): Promise<{ businesses: AdminBusiness[]; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(
        `
        *,
        owner:owner_id (
          id,
          email,
          full_name,
          phone_number,
          role,
          status,
          avatar_url,
          created_at,
          updated_at
        )
      `,
      )
      .eq('status', status);

    if (error) {
      return { businesses: [], error: 'Failed to fetch businesses' };
    }

    return {
      businesses: data as AdminBusiness[],
      error: null as string | null,
    };
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;
    logActionError('getBusinessesByStatus', err);
    return {
      businesses: [],
      error: 'Failed to fetch businesses',
    };
  }
}

/**
 * Count businesses by status
 */
export async function countBusinessesByStatus(): Promise<{
  counts: Record<string, number>;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.from('businesses').select('status');

    if (error) {
      return { counts: {}, error: 'Failed to count businesses' };
    }

    const counts = {
      pending: 0,
      verified: 0,
      suspended: 0,
      rejected: 0,
      total: data.length,
    };

    (data as { status: string }[]).forEach((record) => {
      if (record.status in counts) {
        counts[record.status as keyof typeof counts]++;
      }
    });

    return { counts, error: null as string | null };
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;
    logActionError('countBusinessesByStatus', err);
    return {
      counts: {},
      error: 'Failed to count businesses',
    };
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update business status
 */
export async function updateBusinessStatus(
  businessId: string,
  status: 'pending' | 'verified' | 'suspended' | 'rejected',
): Promise<{ business: Business | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('businesses')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      return { business: null, error: 'Failed to update business' };
    }

    return { business: data as Business, error: null };
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;
    logActionError('updateBusinessStatus', err);
    return {
      business: null,
      error: 'Failed to update business',
    };
  }
}

/**
 * Update business profile details
 */
export async function updateBusinessProfile(
  businessId: string,
  updates: Partial<Business>,
): Promise<{ business: Business | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Remove restricted fields that cannot be updated directly
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, owner_id, created_at, archived_at, ...allowedUpdates } =
      updates;

    const { data, error } = await supabase
      .from('businesses')
      .update({
        ...allowedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      return { business: null, error: 'Failed to update business' };
    }

    return { business: data as Business, error: null };
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;
    logActionError('updateBusinessProfile', err);
    return {
      business: null,
      error: 'Failed to update business',
    };
  }
}

// ============================================================================
// ARCHIVE/DELETE OPERATIONS
// ============================================================================

/**
 * Archive a business (soft delete)
 */
export async function archiveBusinessById(
  businessId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('businesses')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    if (error) {
      return { success: false, error: 'Failed to archive business' };
    }

    return { success: true, error: null };
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;
    logActionError('archiveBusinessById', err);
    return {
      success: false,
      error: 'Failed to archive business',
    };
  }
}

/**
 * Permanently delete a business (hard delete)
 */
export async function deleteBusinessById(
  businessId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (error) {
      return { success: false, error: 'Failed to delete business' };
    }

    return { success: true, error: null };
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;
    logActionError('deleteBusinessById', err);
    return {
      success: false,
      error: 'Failed to delete business',
    };
  }
}

/**
 * Fetch the editable profile fields for the business profile page.
 * Returns only the columns the profile page reads and mutates.
 */
export async function getBusinessProfileData(
  businessId: string,
): Promise<BusinessProfileData | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(
        'id, shop_name, description, logo_url, banner_url, category_id, interior_images, status, updated_at',
      )
      .eq('id', businessId)
      .is('archived_at', null)
      .single();

    if (error || !data) return null;

    // The DB may store bare paths (registration) or full URLs (the upload
    // API). `publicStorageUrl` resolves either and normalises an encoded path
    // so `getPublicUrl` cannot encode it twice (lib/utils/storage.ts).
    const resolve = (bucket: string, pathOrUrl: string | null) =>
      publicStorageUrl(supabase.storage, bucket, pathOrUrl);

    return {
      ...data,
      logo_url: resolve('shop-logos', data.logo_url),
      banner_url: resolve('shop-banners', data.banner_url),
      interior_images:
        (data.interior_images as string[] | null)?.map(
          (url) => resolve('interior-images', url) ?? url,
        ) ?? null,
    } as BusinessProfileData;
  } catch (error) {
    // This function collapses "no such shop" and "the read failed" into one
    // `null` (noted in CLAUDE.md's gallery entry), so without a report a
    // failing read is indistinguishable from a missing business — to the
    // caller AND to us.
    logActionError('getBusinessProfileData', error);
    return null;
  }
}

/**
 * The shop's own categories, for the profile form's picker.
 *
 * 🔴 This exists because that picker was filled from `getCategoriesAction()` —
 * the OFFERING categories ("Food & Beverages", "Home & Living"). But
 * `businesses.category_id` has an FK to `business_categories`, so every option
 * the form offered was an id from the wrong table: saving raised a foreign-key
 * violation and a shop could never change its category from this page.
 *
 * Read on the SERVER and passed down as a prop rather than fetched from an
 * effect: an unguarded `'use server'` export is a public endpoint, and a
 * client fetch here had no `.catch()` (silent empty picker, unhandled
 * rejection, setState after unmount).
 *
 * Soft-deleted rows are filtered, per the embedded-relation convention. Never
 * throws — a failed read renders an empty picker, not a broken page.
 *
 * Filtered to categories that actually HAVE browseable businesses (verified,
 * unarchived) — the same contract as the mobile business-types endpoint — so
 * the picker never offers a dead category. `include` force-keeps category ids
 * even when they currently have no other business (the shop being edited is
 * itself the only member), so an existing selection can always be saved back.
 */
/**
 * One shop's gallery, with the three answers kept apart.
 *
 * `getBusinessProfileData` collapses "this shop does not exist" and "the read
 * failed" into a single `null`, which is fine for a form that 404s either way
 * and wrong for a gallery: six empty tiles and an outage look identical, and
 * the empty state tells an owner to upload photos they may already have.
 *
 * Never throws. Paths are resolved to public URLs on the way out, the same as
 * every other read of this column — the row may hold either representation
 * (registration writes paths, the upload route writes URLs).
 */
export async function getBusinessGallery(businessId: string): Promise<{
  images: string[];
  /** The read itself failed — say so instead of rendering an empty gallery. */
  failed: boolean;
  found: boolean;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('businesses')
      .select('interior_images')
      .eq('id', businessId)
      .is('archived_at', null)
      .maybeSingle();

    if (error) {
      logActionError('getBusinessGallery', error);
      return { images: [], failed: true, found: false };
    }
    if (!data) return { images: [], failed: false, found: false };

    const images = ((data.interior_images as string[] | null) ?? [])
      .map((pathOrUrl) =>
        resolveStorageUrl(supabase, 'interior-images', pathOrUrl),
      )
      .filter((url): url is string => url !== null);

    return { images, failed: false, found: true };
  } catch (err) {
    if (isDynamicUsageError(err)) throw err;
    logActionError('getBusinessGallery', err);
    return { images: [], failed: true, found: false };
  }
}
