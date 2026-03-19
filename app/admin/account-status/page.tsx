'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  restoreUserAction,
  updateAdminStatusAction,
} from '@/app/admin/actions';
import type { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/services/api/paginationService';
import {
  StatusCards,
  ArchivedUsersTab,
  SuspendedUsersTab,
  InactiveUsersTab,
  AccountLifecycleInfo,
} from './components';

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
    }
  };

  const handleReactivate = async (userId: string, userName: string) => {
    try {
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
    }
  };

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
          <ArchivedUsersTab
            users={archivedUsers}
            loading={loading}
            onRestore={handleRestore}
          />
        </TabsContent>

        {/* Suspended Users Tab */}
        <TabsContent value="suspended" className="space-y-4">
          <SuspendedUsersTab
            users={suspendedUsers}
            loading={loading}
            onReactivate={handleReactivate}
          />
        </TabsContent>

        {/* Inactive Users Tab */}
        <TabsContent value="inactive" className="space-y-4">
          <InactiveUsersTab
            users={inactiveUsers}
            loading={loading}
            onReactivate={handleReactivate}
          />
        </TabsContent>
      </Tabs>

      {/* Account Lifecycle Info */}
      <AccountLifecycleInfo />
    </div>
  );
}
