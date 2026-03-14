'use client';

import { useEffect, useState } from 'react';
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

  const fetchProfiles = async () => {
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
      setError(
        err instanceof Error ? err : new Error('Failed to fetch profiles'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [role, page, limit, searchQuery, statusFilter, sortOrder, enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchProfiles,
  };
}
