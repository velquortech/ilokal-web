/**
 * Business Data Queries
 *
 * Direct Supabase queries for business operations.
 * Handles all database interactions with proper error handling.
 */

import { createServerSupabaseClient } from '@/supabase/server';
import { Business, AdminBusiness, BusinessFilters } from '@/lib/types/business';

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
      return { business: null, error: error.message };
    }

    return {
      business: data as AdminBusiness,
      error: null,
    };
  } catch (err) {
    return {
      business: null,
      error: err instanceof Error ? err.message : 'Failed to fetch business',
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

    // Apply search filter
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,owner->email.ilike.%${filters.search}%`,
      );
    }

    // Apply sorting
    const sortField =
      filters.sortBy === 'name'
        ? 'name'
        : filters.sortBy === 'updated'
          ? 'updated_at'
          : 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? true : false; // ascending param

    query = query.order(sortField, { ascending: sortOrder });

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return { data: [], total: 0, error: error.message };
    }

    return {
      data: data as AdminBusiness[],
      total: count || 0,
      error: null as string | null,
    };
  } catch (err) {
    return {
      data: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Failed to fetch businesses',
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
      return { businesses: [], error: error.message };
    }

    return {
      businesses: data as AdminBusiness[],
      error: null as string | null,
    };
  } catch (err) {
    return {
      businesses: [],
      error: err instanceof Error ? err.message : 'Failed to fetch businesses',
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
      return { counts: {}, error: error.message };
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
    return {
      counts: {},
      error: err instanceof Error ? err.message : 'Failed to count businesses',
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
      return { business: null, error: error.message };
    }

    return { business: data as Business, error: null };
  } catch (err) {
    return {
      business: null,
      error: err instanceof Error ? err.message : 'Failed to update business',
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
      return { business: null, error: error.message };
    }

    return { business: data as Business, error: null };
  } catch (err) {
    return {
      business: null,
      error: err instanceof Error ? err.message : 'Failed to update business',
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
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to archive business',
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
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete business',
    };
  }
}
