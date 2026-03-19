'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/services/api/paginationService';

export interface AccountStatusCounts {
  active: number;
  archived: number;
  suspended: number;
  inactive: number;
}

interface UseAccountStatusDataReturn {
  archivedUsers: Profile[];
  suspendedUsers: Profile[];
  inactiveUsers: Profile[];
  counts: AccountStatusCounts;
  loading: boolean;
  loadAccountStatusData: () => Promise<void>;
}

export function useAccountStatusData(): UseAccountStatusDataReturn {
  const [archivedUsers, setArchivedUsers] = useState<Profile[]>([]);
  const [suspendedUsers, setSuspendedUsers] = useState<Profile[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<Profile[]>([]);
  const [counts, setCounts] = useState<AccountStatusCounts>({
    active: 0,
    archived: 0,
    suspended: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(
    async (
      filter: 'active' | 'archived' | 'suspended' | 'inactive',
    ): Promise<number> => {
      try {
        let url = '/api/admin/profiles?limit=1';

        if (filter === 'active') {
          url += '&filter=active';
        } else if (filter === 'archived') {
          url += '&filter=archived';
        } else if (filter === 'suspended') {
          url += '&filter=all&status=suspended';
        } else if (filter === 'inactive') {
          url += '&filter=inactive';
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

  const fetchArchivedUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/profiles?filter=archived&limit=100');
      if (res.ok) {
        const data: PaginatedResponse<Profile> = await res.json();
        setArchivedUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch archived users:', error);
    }
  }, []);

  const fetchSuspendedUsers = useCallback(async () => {
    try {
      const res = await fetch(
        '/api/admin/profiles?filter=all&status=suspended&limit=100',
      );
      if (res.ok) {
        const data: PaginatedResponse<Profile> = await res.json();
        setSuspendedUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch suspended users:', error);
    }
  }, []);

  const fetchInactiveUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/profiles?filter=inactive&limit=100');
      if (res.ok) {
        const data: PaginatedResponse<Profile> = await res.json();
        setInactiveUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch inactive users:', error);
    }
  }, []);

  const fetchAndSetCounts = useCallback(async () => {
    const [activeCount, archivedCount, suspendedCount, inactiveCount] =
      await Promise.all([
        fetchCount('active'),
        fetchCount('archived'),
        fetchCount('suspended'),
        fetchCount('inactive'),
      ]);

    setCounts({
      active: activeCount,
      archived: archivedCount,
      suspended: suspendedCount,
      inactive: inactiveCount,
    });
  }, [fetchCount]);

  const loadAccountStatusData = useCallback(async () => {
    try {
      setLoading(true);

      await Promise.all([
        fetchAndSetCounts(),
        fetchArchivedUsers(),
        fetchSuspendedUsers(),
        fetchInactiveUsers(),
      ]);
    } catch (error) {
      console.error('Failed to load account status data:', error);
      toast.error('Failed to load account status data');
    } finally {
      setLoading(false);
    }
  }, [
    fetchAndSetCounts,
    fetchArchivedUsers,
    fetchSuspendedUsers,
    fetchInactiveUsers,
  ]);

  return {
    archivedUsers,
    suspendedUsers,
    inactiveUsers,
    counts,
    loading,
    loadAccountStatusData,
  };
}
