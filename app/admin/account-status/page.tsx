'use client';

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  restoreUserAction,
  updateAdminStatusAction,
} from '@/app/admin/actions';
import type { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/services/api/paginationService';
import UsersTable from '@/app/admin/components/shared/UsersTable';
import { createAccountStatusColumns } from './components/columns';
import { StatusCards, AccountLifecycleInfo } from './components';

/**
 * Account Status Page
 *
 * Manages account lifecycle:
 * - Archived users (soft deleted) - can be restored
 * - Suspended users (admin action) - can be reactivated
 * - Inactive users (disabled accounts) - can be reactivated
 *
 * This is separate from "Users" page which is for active user management
 */
export default function AccountStatusPage() {
  const [archivedUsers, setArchivedUsers] = useState<Profile[]>([]);
  const [suspendedUsers, setSuspendedUsers] = useState<Profile[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<Profile[]>([]);
  const [counts, setCounts] = useState({
    active: 0,
    archived: 0,
    suspended: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('archived');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAccountStatusData();
  }, []);

  const loadAccountStatusData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
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
  };

  const fetchAndSetCounts = async () => {
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
  };

  const fetchCount = async (
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
  };

  const fetchArchivedUsers = async () => {
    try {
      const res = await fetch('/api/admin/profiles?filter=archived&limit=100');
      if (res.ok) {
        const data: PaginatedResponse<Profile> = await res.json();
        setArchivedUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch archived users:', error);
    }
  };

  const fetchSuspendedUsers = async () => {
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
  };

  const fetchInactiveUsers = async () => {
    try {
      const res = await fetch('/api/admin/profiles?filter=inactive&limit=100');
      if (res.ok) {
        const data: PaginatedResponse<Profile> = await res.json();
        setInactiveUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch inactive users:', error);
    }
  };

  const handleRestore = async (userId: string, userName: string) => {
    try {
      setIsSubmitting(true);
      const result = await restoreUserAction(userId);
      if (result.success) {
        toast.success(`${userName} has been restored to active status`);
        loadAccountStatusData();
      } else {
        toast.error(result.error || 'Failed to restore user');
      }
    } catch (error) {
      console.error('Error restoring user:', error);
      toast.error('Error restoring user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (userId: string, userName: string) => {
    try {
      setIsSubmitting(true);
      const result = await updateAdminStatusAction(userId, 'active');
      if (result.success) {
        toast.success(`${userName} has been reactivated`);
        loadAccountStatusData();
      } else {
        toast.error(result.error || 'Failed to reactivate user');
      }
    } catch (error) {
      console.error('Error reactivating user:', error);
      toast.error('Error reactivating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create paginated response objects for the table
  const archivedPaginatedData: PaginatedResponse<Profile> = useMemo(
    () => ({
      data: archivedUsers,
      pagination: {
        currentPage,
        pageSize: 10,
        totalItems: counts.archived,
        totalPages: Math.ceil(counts.archived / 10),
      },
    }),
    [archivedUsers, currentPage, counts.archived],
  );

  const suspendedPaginatedData: PaginatedResponse<Profile> = useMemo(
    () => ({
      data: suspendedUsers,
      pagination: {
        currentPage,
        pageSize: 10,
        totalItems: counts.suspended,
        totalPages: Math.ceil(counts.suspended / 10),
      },
    }),
    [suspendedUsers, currentPage, counts.suspended],
  );

  const inactivePaginatedData: PaginatedResponse<Profile> = useMemo(
    () => ({
      data: inactiveUsers,
      pagination: {
        currentPage,
        pageSize: 10,
        totalItems: counts.inactive,
        totalPages: Math.ceil(counts.inactive / 10),
      },
    }),
    [inactiveUsers, currentPage, counts.inactive],
  );

  // Create columns for each account type
  const archivedColumns = useMemo(
    () =>
      createAccountStatusColumns({
        currentPage,
        isSubmitting,
        onRestore: handleRestore,
        accountType: 'archived',
      }),
    [currentPage, isSubmitting],
  );

  const suspendedColumns = useMemo(
    () =>
      createAccountStatusColumns({
        currentPage,
        isSubmitting,
        onReactivate: handleReactivate,
        accountType: 'suspended',
      }),
    [currentPage, isSubmitting],
  );

  const inactiveColumns = useMemo(
    () =>
      createAccountStatusColumns({
        currentPage,
        isSubmitting,
        onReactivate: handleReactivate,
        accountType: 'inactive',
      }),
    [currentPage, isSubmitting],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Status</h1>
        <p className="text-muted-foreground mt-2">
          Manage archived, suspended, and inactive user accounts
        </p>
      </div>

      {/* Status Cards */}
      <StatusCards counts={counts} loading={loading} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="archived">Archived Users</TabsTrigger>
          <TabsTrigger value="suspended">Suspended Users</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Users</TabsTrigger>
        </TabsList>

        {/* Archived Users Tab */}
        <TabsContent value="archived" className="space-y-4">
          <UsersTable<Profile>
            data={archivedPaginatedData}
            isLoading={loading}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            columns={archivedColumns}
            isSubmitting={isSubmitting}
            showDeleteConfirmation={false}
          />
        </TabsContent>

        {/* Suspended Users Tab */}
        <TabsContent value="suspended" className="space-y-4">
          <UsersTable<Profile>
            data={suspendedPaginatedData}
            isLoading={loading}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            columns={suspendedColumns}
            isSubmitting={isSubmitting}
            showDeleteConfirmation={false}
          />
        </TabsContent>

        {/* Inactive Users Tab */}
        <TabsContent value="inactive" className="space-y-4">
          <UsersTable<Profile>
            data={inactivePaginatedData}
            isLoading={loading}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            columns={inactiveColumns}
            isSubmitting={isSubmitting}
            showDeleteConfirmation={false}
          />
        </TabsContent>
      </Tabs>

      {/* Account Lifecycle Info */}
      <AccountLifecycleInfo />
    </div>
  );
}
