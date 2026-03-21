/**
 * User Query Filters
 *
 * Provides different query filters for user lists:
 * - active: Only non-archived users with status='active'
 * - archived: Only archived users (archived_at IS NOT NULL)
 * - all: All users (admin-only view)
 * - inactive: Only inactive users (status='inactive' or 'suspended')
 */

import { createServerSupabaseClient } from '@/config/server';
import { AdminUser } from '@/lib/types/admin';

export type UserFilterType = 'active' | 'archived' | 'all' | 'inactive';

export interface UserQueryParams {
  filter?: UserFilterType;
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'latest' | 'oldest';
}

export interface UserListResult {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get filtered users list
 */
export async function getUsersFiltered(
  params: UserQueryParams,
): Promise<{ data?: UserListResult; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      filter = 'active',
      role,
      status,
      search,
      page = 1,
      limit = 10,
      sort = 'latest',
    } = params;

    // Start building query
    let query = supabase.from('profiles').select('*', { count: 'exact' });

    // FILTER BY ARCHIVE STATUS
    switch (filter) {
      case 'active':
        // Only non-archived, active accounts
        query = query.is('archived_at', null).eq('status', 'active');
        break;

      case 'archived':
        // Only archived accounts
        query = query.not('archived_at', 'is', null);
        break;

      case 'inactive':
        // Only inactive/suspended accounts (not archived)
        query = query
          .is('archived_at', null)
          .in('status', ['inactive', 'suspended']);
        break;

      case 'all':
        // Show everything (admin-only, no filter)
        break;

      default:
        return { error: `Invalid filter: ${filter}` };
    }

    // APPLY ROLE FILTER
    if (role) {
      query = query.eq('role', role);
    }

    // APPLY STATUS FILTER (if not already filtered)
    if (status && filter !== 'archived' && filter !== 'inactive') {
      query = query.eq('status', status);
    }

    // APPLY SEARCH FILTER
    if (search) {
      const escapedSearch = search
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "''")
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');

      const likePattern = `"%${escapedSearch}%"`;

      query = query.or(
        `full_name.ilike.${likePattern},email.ilike.${likePattern}`,
      );
    }

    // APPLY SORTING
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // APPLY PAGINATION
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // EXECUTE QUERY
    const { data: users, count, error } = await query;

    if (error) {
      return { error: error.message };
    }

    const total = count || 0;

    return {
      data: {
        users: users || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch users',
    };
  }
}

/**
 * Get user counts by filter type
 */
export async function getUserCounts(): Promise<{
  data?: Record<string, number>;
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get active count
    const { count: activeCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .eq('status', 'active');

    // Get archived count
    const { count: archivedCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .not('archived_at', 'is', null);

    // Get inactive count
    const { count: inactiveCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .in('status', ['inactive', 'suspended']);

    // Get total count
    const { count: totalCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    return {
      data: {
        active: activeCount || 0,
        archived: archivedCount || 0,
        inactive: inactiveCount || 0,
        total: totalCount || 0,
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch counts',
    };
  }
}
