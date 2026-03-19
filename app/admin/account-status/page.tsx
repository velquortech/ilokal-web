'use client';

import { useEffect, useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Profile } from '@/lib/types/user';
import { PaginatedResponse } from '@/services/api/paginationService';
import { useAccountStatusData } from './hooks/useAccountStatusData';
import { useAccountStatusActions } from './hooks/useAccountStatusActions';
import { StatusCards, AccountLifecycleInfo } from './components';
import {
  ArchivedUsersTab,
  SuspendedUsersTab,
  InactiveUsersTab,
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
  const [activeTab, setActiveTab] = useState('archived');
  const [currentPage, setCurrentPage] = useState(1);

  const {
    archivedUsers,
    suspendedUsers,
    inactiveUsers,
    counts,
    loading,
    loadAccountStatusData,
  } = useAccountStatusData();

  const { isSubmitting, handleRestore, handleReactivate } =
    useAccountStatusActions(loadAccountStatusData);

  useEffect(() => {
    loadAccountStatusData();
  }, [loadAccountStatusData]);

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

        {/* Tab Content */}
        <ArchivedUsersTab
          data={archivedPaginatedData}
          isLoading={loading}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isSubmitting={isSubmitting}
          onRestore={handleRestore}
        />

        <SuspendedUsersTab
          data={suspendedPaginatedData}
          isLoading={loading}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isSubmitting={isSubmitting}
          onReactivate={handleReactivate}
        />

        <InactiveUsersTab
          data={inactivePaginatedData}
          isLoading={loading}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isSubmitting={isSubmitting}
          onReactivate={handleReactivate}
        />
      </Tabs>

      {/* Account Lifecycle Info */}
      <AccountLifecycleInfo />
    </div>
  );
}
