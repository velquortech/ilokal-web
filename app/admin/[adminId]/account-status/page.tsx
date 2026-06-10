'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserRole } from '@/lib/types/user';
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
  const [activeTab, setActiveTab] = useState<
    'archived' | 'suspended' | 'inactive'
  >('archived');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');

  // Separate pagination for each tab
  const [archivedPage, setArchivedPage] = useState(1);
  const [suspendedPage, setSuspendedPage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);

  const {
    archivedData,
    suspendedData,
    inactiveData,
    counts,
    loading,
    tabLoading,
    loadAccountStatusData,
  } = useAccountStatusData(
    selectedRole,
    archivedPage,
    suspendedPage,
    inactivePage,
    activeTab,
  );

  const { isSubmitting, handleRestore, handleReactivate } =
    useAccountStatusActions(loadAccountStatusData);

  // Handle tab switch
  const handleTabChange = (tab: string) => {
    const newTab = tab as 'archived' | 'suspended' | 'inactive';
    setActiveTab(newTab);
    // The lazy load effect in the hook will automatically fetch data when activeTab changes
  };

  // Determine current page based on active tab
  const handlePageChange = (page: number) => {
    if (activeTab === 'archived') {
      setArchivedPage(page);
    } else if (activeTab === 'suspended') {
      setSuspendedPage(page);
    } else if (activeTab === 'inactive') {
      setInactivePage(page);
    }
  };

  return (
    <div className="flex flex-1 flex-col space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Status</h1>
        <p className="text-muted-foreground mt-2">
          Manage archived, suspended, and inactive user accounts
        </p>
      </div>

      {/* Role Filter */}
      <div className="flex items-center gap-3">
        <label htmlFor="role-filter" className="text-sm font-medium">
          Filter by Role:
        </label>
        <Select
          value={selectedRole}
          onValueChange={(value) => {
            setSelectedRole(value as UserRole | 'all');
            // Reset all pagination to 1 when role filter changes
            setArchivedPage(1);
            setSuspendedPage(1);
            setInactivePage(1);
          }}
        >
          <SelectTrigger id="role-filter" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="business_owner">Business Owner</SelectItem>
            <SelectItem value="app_user">App User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Cards */}
      <StatusCards counts={counts} loading={loading} />

      {/* Account Lifecycle Info */}
      <AccountLifecycleInfo />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="archived">Archived Users</TabsTrigger>
          <TabsTrigger value="suspended">Suspended Users</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Users</TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <ArchivedUsersTab
          data={archivedData}
          isLoading={tabLoading.archived}
          currentPage={archivedPage}
          onPageChange={handlePageChange}
          isSubmitting={isSubmitting}
          onRestore={handleRestore}
        />

        <SuspendedUsersTab
          data={suspendedData}
          isLoading={tabLoading.suspended}
          currentPage={suspendedPage}
          onPageChange={handlePageChange}
          isSubmitting={isSubmitting}
          onReactivate={handleReactivate}
        />

        <InactiveUsersTab
          data={inactiveData}
          isLoading={tabLoading.inactive}
          currentPage={inactivePage}
          onPageChange={handlePageChange}
          isSubmitting={isSubmitting}
          onReactivate={handleReactivate}
        />
      </Tabs>
    </div>
  );
}
