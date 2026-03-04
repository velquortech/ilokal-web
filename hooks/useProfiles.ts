import { useQuery } from '@tanstack/react-query';
import userService from '@/lib/api/userService';
import { Profile, UserRole } from '@/lib/types/user';
import { PaginatedResponse } from '@/lib/api/paginationService';

interface UseProfilesByRoleOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useProfilesByRole(
  role: UserRole,
  { page = 1, limit = 10, enabled = true }: UseProfilesByRoleOptions = {},
) {
  return useQuery({
    queryKey: ['profiles', role, page, limit],
    queryFn: () => userService.getProfilesByRolePaginated(role, page, limit),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useApplyFilters(
  data: PaginatedResponse<Profile> | undefined,
  searchQuery: string,
  statusFilter: 'all' | 'active' | 'inactive' | 'suspended',
  sortOrder: 'latest' | 'oldest',
  page: number,
  pageSize: number,
): PaginatedResponse<Profile> | null {
  if (!data) return null;

  let filtered = [...data.data];

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (item) =>
        item.full_name?.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query),
    );
  }

  // Apply status filter
  if (statusFilter !== 'all') {
    filtered = filtered.filter((item) => item.status === statusFilter);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedFiltered = filtered.slice(startIndex, startIndex + pageSize);

  return {
    data: paginatedFiltered,
    pagination: {
      currentPage: page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}
