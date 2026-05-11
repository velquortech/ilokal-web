'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import userService from '@/services/api/userService';
import { AdminUser, AdminTabFilterState } from '@/lib/types/admin';
import { UserRole } from '@/lib/types/user';
import { PaginatedResponse } from '@/services/api/paginationService';
import { ADMIN_CONFIG } from '@/app/admin/config/adminConfig';

interface UseUserTabsDataReturn {
  adminData: PaginatedResponse<AdminUser> | null;
  businessOwnerData: PaginatedResponse<AdminUser> | null;
  appUserData: PaginatedResponse<AdminUser> | null;
  tabLoading: {
    admin: boolean;
    business_owner: boolean;
    app_user: boolean;
  };
  refetchTab: (role: UserRole) => Promise<void>;
}

export function useUserTabsData(
  activeTab: UserRole,
  adminFilters: AdminTabFilterState,
  businessOwnerFilters: AdminTabFilterState,
  appUserFilters: AdminTabFilterState,
): UseUserTabsDataReturn {
  const [adminData, setAdminData] =
    useState<PaginatedResponse<AdminUser> | null>(null);
  const [businessOwnerData, setBusinessOwnerData] =
    useState<PaginatedResponse<AdminUser> | null>(null);
  const [appUserData, setAppUserData] =
    useState<PaginatedResponse<AdminUser> | null>(null);

  const [tabLoading, setTabLoading] = useState({
    admin: false,
    business_owner: false,
    app_user: false,
  });

  // Cache tracking with format: "role-page-search-status-sort"
  const fetchedTabsRef = useRef<Set<string>>(new Set());

  // Build cache key for a tab
  const getCacheKey = (role: UserRole, filters: AdminTabFilterState) =>
    `${role}-${filters.page}-${filters.searchQuery}-${filters.statusFilter}-${filters.sortOrder}`;

  // Fetch data for a specific role
  const fetchRoleData = useCallback(
    async (
      role: UserRole,
      filters: AdminTabFilterState,
    ): Promise<PaginatedResponse<AdminUser> | null> => {
      try {
        const result = await userService.getProfilesByRolePaginated(
          role,
          filters.page,
          ADMIN_CONFIG.ITEMS_PER_PAGE,
          {
            searchQuery: filters.searchQuery,
            statusFilter: filters.statusFilter,
            sortOrder: filters.sortOrder,
          },
        );
        return result;
      } catch (error) {
        console.error(`Failed to fetch ${role} data:`, error);
        toast.error(`Failed to load ${role} users`);
        return null;
      }
    },
    [],
  );

  // Fetch specific tab data (lazy load)
  const fetchTabData = useCallback(
    async (role: UserRole, filters: AdminTabFilterState) => {
      const cacheKey = getCacheKey(role, filters);

      // Skip if already cached
      if (fetchedTabsRef.current.has(cacheKey)) {
        return;
      }

      try {
        setTabLoading((prev) => ({ ...prev, [role]: true }));

        const data = await fetchRoleData(role, filters);

        if (role === 'admin') {
          setAdminData(data);
        } else if (role === 'business_owner') {
          setBusinessOwnerData(data);
        } else if (role === 'app_user') {
          setAppUserData(data);
        }

        fetchedTabsRef.current.add(cacheKey);
      } finally {
        setTabLoading((prev) => ({ ...prev, [role]: false }));
      }
    },
    [fetchRoleData],
  );

  // Load active tab on mount and when it changes
  useEffect(() => {
    const filters =
      activeTab === 'admin'
        ? adminFilters
        : activeTab === 'business_owner'
          ? businessOwnerFilters
          : appUserFilters;

    fetchTabData(activeTab, filters);
  }, [
    activeTab,
    adminFilters,
    businessOwnerFilters,
    appUserFilters,
    fetchTabData,
  ]);

  // Refetch tab data (used after mutations)
  const refetchTab = useCallback(
    async (role: UserRole) => {
      const filters =
        role === 'admin'
          ? adminFilters
          : role === 'business_owner'
            ? businessOwnerFilters
            : appUserFilters;

      const cacheKey = getCacheKey(role, filters);
      // Invalidate cache for this specific combination
      fetchedTabsRef.current.delete(cacheKey);

      // Fetch fresh data
      const data = await fetchRoleData(role, filters);

      if (role === 'admin') {
        setAdminData(data);
      } else if (role === 'business_owner') {
        setBusinessOwnerData(data);
      } else if (role === 'app_user') {
        setAppUserData(data);
      }

      fetchedTabsRef.current.add(cacheKey);
    },
    [adminFilters, businessOwnerFilters, appUserFilters, fetchRoleData],
  );

  return {
    adminData,
    businessOwnerData,
    appUserData,
    tabLoading,
    refetchTab,
  };
}
