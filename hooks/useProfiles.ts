'use client';

import { useEffect, useState, useCallback } from 'react';
import userService from '@/services/api/userService';
import { UserRole, Profile } from '@/lib/types/user';
import { ADMIN_CONFIG } from '@/app/admin/config/adminConfig';
import { PaginatedResponse } from '@/services/api/paginationService';

interface UseProfilesByRoleOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
  searchQuery?: string;
  statusFilter?: 'all' | 'active' | 'inactive' | 'suspended';
  sortOrder?: 'latest' | 'oldest';
}

interface UseProfilesByRoleResult {
  data?: PaginatedResponse<Profile>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProfilesByRole(
  role: UserRole,
  {
    page = 1,
    limit = ADMIN_CONFIG.ITEMS_PER_PAGE,
    enabled = true,
    searchQuery = '',
    statusFilter = 'all',
    sortOrder = 'latest',
  }: UseProfilesByRoleOptions = {},
): UseProfilesByRoleResult {
  const [data, setData] = useState<PaginatedResponse<Profile>>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoized fetch function to prevent recreation on every render
  const fetchProfiles = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await userService.getProfilesByRolePaginated(
        role,
        page,
        limit,
        {
          searchQuery,
          statusFilter,
          sortOrder,
        },
      );
      setData(result);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to fetch profiles');
      setError(error);
      console.error('Error fetching profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [role, page, limit, enabled, searchQuery, statusFilter, sortOrder]);

  // Use effect with proper dependency management
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchProfiles,
  };
}
