import { useQuery } from '@tanstack/react-query';
import userService from '@/services/api/userService';
import { UserRole } from '@/lib/types/user';
import { ADMIN_CONFIG } from '@/app/admin/config/adminConfig';

interface UseProfilesByRoleOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
  searchQuery?: string;
  statusFilter?: 'all' | 'active' | 'inactive' | 'suspended';
  sortOrder?: 'latest' | 'oldest';
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
) {
  return useQuery({
    queryKey: [
      'profiles',
      role,
      page,
      limit,
      searchQuery,
      statusFilter,
      sortOrder,
    ],
    queryFn: () =>
      userService.getProfilesByRolePaginated(role, page, limit, {
        searchQuery,
        statusFilter,
        sortOrder,
      }),
    enabled,
    staleTime: ADMIN_CONFIG.QUERY_STALE_TIME,
  });
}
