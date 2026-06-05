/**
 * Branch Query Layer
 * Handles all direct Supabase database operations for branches
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type { Branch, BranchResponse, BranchFilters } from '@/lib/types';

// ===== Branch Queries =====

/**
 * Get paginated branches with optional search and proximity filtering
 */
export async function getBranchesPaginated(filters: BranchFilters) {
  try {
    const {
      page = 1,
      per_page = 20,
      search,
      latitude,
      longitude,
      radius_km,
      sort_by = 'name_asc',
    } = filters;
    const offset = (page - 1) * per_page;

    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('branches')
      .select('*', { count: 'exact' })
      .is('archived_at', null); // Exclude soft-deleted branches

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    // Apply sorting
    if (sort_by === 'name_desc') {
      query = query.order('name', { ascending: false });
    } else if (sort_by === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort_by === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else {
      // name_asc (default)
      query = query.order('name', { ascending: true });
    }

    const { data, count, error } = await query.range(
      offset,
      offset + per_page - 1,
    );

    if (error) {
      return {
        branches: [] as BranchResponse[],
        total: 0,
        error: `Failed to fetch branches: ${error.message}` as const,
      };
    }

    // Handle proximity filtering if latitude/longitude provided
    let branches: BranchResponse[] = (data || []) as Branch[];

    if (latitude !== undefined && longitude !== undefined && radius_km) {
      branches = branches.filter((branch) => {
        if (!branch.location) return false;

        const [lng, lat] = branch.location.coordinates;
        const distance = calculateDistance(latitude, longitude, lat, lng);

        if (distance > radius_km) return false;

        return true;
      }) as BranchResponse[];

      // Recalculate distance_km for each branch
      branches = branches.map((branch) => {
        if (!branch.location) return branch;

        const [lng, lat] = branch.location.coordinates;
        const distance_km = calculateDistance(latitude, longitude, lat, lng);

        return {
          ...branch,
          distance_km,
        };
      });

      // Sort by distance
      branches.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
    }

    return {
      branches,
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  } catch (err) {
    console.error('[getBranchesPaginated]', err);
    return {
      branches: [] as BranchResponse[],
      total: 0,
      error: 'Failed to fetch branches' as const,
    };
  }
}

/**
 * Get branch by ID
 */
export async function getBranchById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', id)
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return { error: 'Branch not found' as const };
    }

    return { branch: data as Branch };
  } catch (err) {
    console.error('[getBranchById]', err);
    return { error: 'Failed to fetch branch' as const };
  }
}

/**
 * Get all branches for a specific business
 */
export async function getBranchesByBusinessId(
  businessId: string,
  filters: BranchFilters = {},
) {
  try {
    const {
      page = 1,
      per_page = 20,
      search,
      sort_by = 'name_asc',
      status,
    } = filters;
    const offset = (page - 1) * per_page;

    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('branches')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .is('archived_at', null);

    // Default: only show active branches. Pass status='all' to see all statuses.
    if (!status || status === 'active') {
      query = query.eq('status', 'active');
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    // Apply sorting
    if (sort_by === 'name_desc') {
      query = query.order('name', { ascending: false });
    } else if (sort_by === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort_by === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else {
      // name_asc (default)
      query = query.order('name', { ascending: true });
    }

    const { data, count, error } = await query.range(
      offset,
      offset + per_page - 1,
    );

    if (error) {
      return {
        branches: [] as Branch[],
        total: 0,
        error: `Failed to fetch branches: ${error.message}` as const,
      };
    }

    return {
      branches: (data || []) as Branch[],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  } catch (err) {
    console.error('[getBranchesByBusinessId]', err);
    return {
      branches: [] as Branch[],
      total: 0,
      error: 'Failed to fetch branches' as const,
    };
  }
}

/**
 * Check if branch exists
 */
export async function branchExists(id: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();

    const { count } = await supabase
      .from('branches')
      .select('id', { count: 'exact', head: true })
      .eq('id', id)
      .is('archived_at', null);

    return (count || 0) > 0;
  } catch (err) {
    console.error('[branchExists]', err);
    return false;
  }
}

/**
 * Helper: Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}
