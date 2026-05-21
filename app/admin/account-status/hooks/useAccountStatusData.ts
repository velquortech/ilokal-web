'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { Profile, UserRole } from '@/lib/types/user';
import { PaginatedResponse } from '@/lib/services';
import { ROUTES } from '@/config/routeConfig';

export interface AccountStatusCounts {
  active: number;
  archived: number;
  suspended: number;
  inactive: number;
}

interface UseAccountStatusDataReturn {
  archivedData: PaginatedResponse<Profile> | null;
  suspendedData: PaginatedResponse<Profile> | null;
  inactiveData: PaginatedResponse<Profile> | null;
  counts: AccountStatusCounts;
  loading: boolean;
  tabLoading: { archived: boolean; suspended: boolean; inactive: boolean };
  loadAccountStatusData: () => Promise<void>;
  fetchTabData: (tab: 'archived' | 'suspended' | 'inactive') => Promise<void>;
}

interface FetchOptions {
  filter: 'archived' | 'suspended' | 'inactive';
  role?: UserRole;
  page: number;
  limit: number;
}

export function useAccountStatusData(
  selectedRole: UserRole | 'all',
  archivedPage: number,
  suspendedPage: number,
  inactivePage: number,
  activeTab: 'archived' | 'suspended' | 'inactive',
): UseAccountStatusDataReturn {
  const [archivedData, setArchivedData] =
    useState<PaginatedResponse<Profile> | null>(null);
  const [suspendedData, setSuspendedData] =
    useState<PaginatedResponse<Profile> | null>(null);
  const [inactiveData, setInactiveData] =
    useState<PaginatedResponse<Profile> | null>(null);
  const [counts, setCounts] = useState<AccountStatusCounts>({
    active: 0,
    archived: 0,
    suspended: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState({
    archived: false,
    suspended: false,
    inactive: false,
  });

  // Track which tabs have been fetched to avoid refetching on pagination change
  // Format: "tab-role-page"
  const fetchedTabsRef = useRef<Set<string>>(new Set());
  // Track if counts have been fetched for current role
  const countsRefRef = useRef<{
    fetched: boolean;
    role: UserRole | 'all' | null;
  }>({ fetched: false, role: null });

  // Build cache key for a tab
  const getCacheKey = (
    tab: string,
    role: UserRole | 'all' | undefined,
    page: number,
  ) => `${tab}-${role || 'all'}-${page}`;

  const fetchCount = useCallback(
    async (
      filter: 'active' | 'archived' | 'suspended' | 'inactive',
      role?: UserRole,
    ): Promise<number> => {
      try {
        let url = `${ROUTES.API.ADMIN.PROFILES}?limit=1`;

        if (filter === 'active') {
          url += '&filter=active';
        } else if (filter === 'archived') {
          url += '&filter=archived';
        } else if (filter === 'suspended') {
          url += '&filter=all&status=suspended';
        } else if (filter === 'inactive') {
          url += '&filter=all&status=inactive';
        }

        // Add role filter if provided
        if (role) {
          url += `&role=${role}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data: PaginatedResponse<Profile> = await res.json();
          return data.pagination.totalItems;
        }
        return 0;
      } catch (error) {
        console.error(`Failed to fetch ${filter} count:`, error);
        return 0;
      }
    },
    [],
  );

  const fetchStatusData = useCallback(
    async (
      options: FetchOptions,
    ): Promise<PaginatedResponse<Profile> | null> => {
      try {
        let url = `${ROUTES.API.ADMIN.PROFILES}?page=${options.page}&limit=${options.limit}`;

        if (options.filter === 'archived') {
          url += '&filter=archived';
        } else if (options.filter === 'suspended') {
          url += '&filter=all&status=suspended';
        } else if (options.filter === 'inactive') {
          url += '&filter=all&status=inactive';
        }

        // Add role filter if provided
        if (options.role) {
          url += `&role=${options.role}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data: PaginatedResponse<Profile> = await res.json();
          return data;
        }
        return null;
      } catch (error) {
        console.error(`Failed to fetch ${options.filter} data:`, error);
        return null;
      }
    },
    [],
  );

  const fetchAndSetCounts = useCallback(
    async (role?: UserRole) => {
      const [activeCount, archivedCount, suspendedCount, inactiveCount] =
        await Promise.all([
          fetchCount('active', role),
          fetchCount('archived', role),
          fetchCount('suspended', role),
          fetchCount('inactive', role),
        ]);

      setCounts({
        active: activeCount,
        archived: archivedCount,
        suspended: suspendedCount,
        inactive: inactiveCount,
      });
    },
    [fetchCount],
  );

  // Refetch all data (used after actions like restore/reactivate)
  const loadAccountStatusData = useCallback(async () => {
    try {
      setLoading(true);
      const roleFilter = selectedRole === 'all' ? undefined : selectedRole;

      // Refetch counts
      await fetchAndSetCounts(roleFilter);

      // Refetch current tab data
      if (activeTab === 'archived') {
        const data = await fetchStatusData({
          filter: 'archived',
          role: roleFilter,
          page: archivedPage,
          limit: 10,
        });
        setArchivedData(data);
      } else if (activeTab === 'suspended') {
        const data = await fetchStatusData({
          filter: 'suspended',
          role: roleFilter,
          page: suspendedPage,
          limit: 10,
        });
        setSuspendedData(data);
      } else if (activeTab === 'inactive') {
        const data = await fetchStatusData({
          filter: 'inactive',
          role: roleFilter,
          page: inactivePage,
          limit: 10,
        });
        setInactiveData(data);
      }
    } catch (error) {
      console.error('Failed to refetch account status data:', error);
      toast.error('Failed to refetch data');
    } finally {
      setLoading(false);
    }
  }, [
    selectedRole,
    activeTab,
    archivedPage,
    suspendedPage,
    inactivePage,
    fetchStatusData,
    fetchAndSetCounts,
  ]);

  // Fetch specific tab data (lazy load)
  const fetchTabData = useCallback(
    async (tab: 'archived' | 'suspended' | 'inactive') => {
      const roleFilter = selectedRole === 'all' ? undefined : selectedRole;
      const page =
        tab === 'archived'
          ? archivedPage
          : tab === 'suspended'
            ? suspendedPage
            : inactivePage;
      const cacheKey = getCacheKey(tab, roleFilter, page);

      // Skip if already cached
      if (fetchedTabsRef.current.has(cacheKey)) {
        return;
      }

      try {
        setTabLoading((prev) => ({ ...prev, [tab]: true }));

        const data = await fetchStatusData({
          filter: tab,
          role: roleFilter,
          page,
          limit: 10,
        });

        if (tab === 'archived') {
          setArchivedData(data);
        } else if (tab === 'suspended') {
          setSuspendedData(data);
        } else if (tab === 'inactive') {
          setInactiveData(data);
        }

        fetchedTabsRef.current.add(cacheKey);
      } catch (error) {
        console.error(`Failed to fetch ${tab} tab data:`, error);
        toast.error(`Failed to load ${tab} users`);
      } finally {
        setTabLoading((prev) => ({ ...prev, [tab]: false }));
      }
    },
    [selectedRole, archivedPage, suspendedPage, inactivePage, fetchStatusData],
  );

  // Initialize on mount and when role changes
  useEffect(() => {
    const roleFilter = selectedRole === 'all' ? undefined : selectedRole;

    // Only fetch counts if role changed
    if (
      !countsRefRef.current.fetched ||
      countsRefRef.current.role !== selectedRole
    ) {
      setLoading(true);
      // Clear tab cache when role changes (data is role-specific)
      if (countsRefRef.current.fetched) {
        fetchedTabsRef.current.clear();
        setArchivedData(null);
        setSuspendedData(null);
        setInactiveData(null);
      }

      fetchAndSetCounts(roleFilter).then(() => {
        countsRefRef.current = { fetched: true, role: selectedRole };
        setLoading(false);
      });
    }
  }, [selectedRole, fetchAndSetCounts]);

  // Lazy load tab data when activeTab changes
  useEffect(() => {
    const roleFilter = selectedRole === 'all' ? undefined : selectedRole;
    const cacheKey =
      activeTab === 'archived'
        ? getCacheKey('archived', roleFilter, archivedPage)
        : activeTab === 'suspended'
          ? getCacheKey('suspended', roleFilter, suspendedPage)
          : getCacheKey('inactive', roleFilter, inactivePage);

    if (!fetchedTabsRef.current.has(cacheKey)) {
      if (activeTab === 'archived') {
        fetchStatusData({
          filter: 'archived',
          role: roleFilter,
          page: archivedPage,
          limit: 10,
        }).then((data) => {
          setArchivedData(data);
          fetchedTabsRef.current.add(cacheKey);
        });
      } else if (activeTab === 'suspended') {
        fetchStatusData({
          filter: 'suspended',
          role: roleFilter,
          page: suspendedPage,
          limit: 10,
        }).then((data) => {
          setSuspendedData(data);
          fetchedTabsRef.current.add(cacheKey);
        });
      } else if (activeTab === 'inactive') {
        fetchStatusData({
          filter: 'inactive',
          role: roleFilter,
          page: inactivePage,
          limit: 10,
        }).then((data) => {
          setInactiveData(data);
          fetchedTabsRef.current.add(cacheKey);
        });
      }
    }
  }, [
    activeTab,
    selectedRole,
    archivedPage,
    suspendedPage,
    inactivePage,
    fetchStatusData,
  ]);

  // Handle pagination updates for active tab
  useEffect(() => {
    const roleFilter = selectedRole === 'all' ? undefined : selectedRole;

    // Only update if tab is already cached (loaded)
    const currentTabPrefix =
      activeTab === 'archived'
        ? `archived-${roleFilter || 'all'}`
        : activeTab === 'suspended'
          ? `suspended-${roleFilter || 'all'}`
          : `inactive-${roleFilter || 'all'}`;

    const isTabLoaded = Array.from(fetchedTabsRef.current).some((key) =>
      key.startsWith(currentTabPrefix),
    );

    if (!isTabLoaded) return;

    const cacheKey =
      activeTab === 'archived'
        ? getCacheKey('archived', roleFilter, archivedPage)
        : activeTab === 'suspended'
          ? getCacheKey('suspended', roleFilter, suspendedPage)
          : getCacheKey('inactive', roleFilter, inactivePage);

    // Refetch if page changed for active tab
    if (!fetchedTabsRef.current.has(cacheKey)) {
      if (activeTab === 'archived') {
        fetchStatusData({
          filter: 'archived',
          role: roleFilter,
          page: archivedPage,
          limit: 10,
        }).then((data) => {
          setArchivedData(data);
          fetchedTabsRef.current.add(cacheKey);
        });
      } else if (activeTab === 'suspended') {
        fetchStatusData({
          filter: 'suspended',
          role: roleFilter,
          page: suspendedPage,
          limit: 10,
        }).then((data) => {
          setSuspendedData(data);
          fetchedTabsRef.current.add(cacheKey);
        });
      } else if (activeTab === 'inactive') {
        fetchStatusData({
          filter: 'inactive',
          role: roleFilter,
          page: inactivePage,
          limit: 10,
        }).then((data) => {
          setInactiveData(data);
          fetchedTabsRef.current.add(cacheKey);
        });
      }
    }
  }, [
    activeTab,
    selectedRole,
    archivedPage,
    suspendedPage,
    inactivePage,
    fetchStatusData,
  ]);

  return {
    archivedData,
    suspendedData,
    inactiveData,
    counts,
    loading,
    tabLoading,
    loadAccountStatusData,
    fetchTabData,
  };
}
