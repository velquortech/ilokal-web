'use client';

import { useState } from 'react';
import { USER_MANAGEMENT_TABS } from '../config/tabsConfig';
import { AdminErrorBoundary } from '../components/shared/AdminErrorBoundary';
import { useUserTabsData } from './hooks/useUserTabsData';
import { AdminTab, BusinessOwnerTab, ConsumersTab } from './tabs';
import { ROUTES } from '@/config/routeConfig';
import { Button } from '@/components/ui/button';
import { AdminTabFilterState } from '@/lib/types/admin';
import { UserRole } from '@/lib/types/user';

type TabId = 'admins' | 'business-owners' | 'consumers';

export default function UserManagementHub() {
  const [activeTab, setActiveTab] = useState<TabId>('admins');

  // Filter states for each tab
  const [adminFilters, setAdminFilters] = useState<AdminTabFilterState>({
    page: 1,
    searchQuery: '',
    statusFilter: 'all',
    sortOrder: 'latest',
  });

  const [businessOwnerFilters, setBusinessOwnerFilters] =
    useState<AdminTabFilterState>({
      page: 1,
      searchQuery: '',
      statusFilter: 'all',
      sortOrder: 'latest',
    });

  const [appUserFilters, setAppUserFilters] = useState<AdminTabFilterState>({
    page: 1,
    searchQuery: '',
    statusFilter: 'all',
    sortOrder: 'latest',
  });

  // Map tab id to role
  const getActiveRole = (tab: TabId): UserRole => {
    switch (tab) {
      case 'admins':
        return 'admin';
      case 'business-owners':
        return 'business_owner';
      case 'consumers':
        return 'app_user';
      default:
        return 'admin';
    }
  };

  const activeRole = getActiveRole(activeTab);

  // Use centralized data fetching with caching
  const {
    adminData,
    businessOwnerData,
    appUserData,
    tabLoading,
    refetchTab,
    authRequired,
  } = useUserTabsData(
    activeRole,
    adminFilters,
    businessOwnerFilters,
    appUserFilters,
  );

  return (
    <div className="flex flex-1 flex-col space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage admins, business owners, and user accounts
        </p>
      </div>
      {/* Tabs */}
      <div>
        <div className="border-border flex w-full max-w-2xl border-b">
          {USER_MANAGEMENT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex cursor-pointer items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary border-b-2'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span
                className={
                  activeTab === tab.id
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4 space-y-4">
          {authRequired && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
              <h3 className="text-lg font-semibold text-yellow-800">
                Authentication required
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                You must sign in to view and manage users.
              </p>
              <div className="mt-4">
                <Button
                  onClick={() => (window.location.href = ROUTES.AUTH.LOGIN)}
                  className="gap-2"
                >
                  Sign in
                </Button>
              </div>
            </div>
          )}
          <AdminErrorBoundary>
            {activeTab === 'admins' && (
              <AdminTab
                data={adminData}
                isLoading={tabLoading.admin}
                filters={adminFilters}
                onFiltersChange={setAdminFilters}
                _onRefetch={() => refetchTab('admin')}
              />
            )}
            {activeTab === 'business-owners' && (
              <BusinessOwnerTab
                data={businessOwnerData}
                isLoading={tabLoading.business_owner}
                filters={businessOwnerFilters}
                onFiltersChange={setBusinessOwnerFilters}
                _onRefetch={() => refetchTab('business_owner')}
              />
            )}
            {activeTab === 'consumers' && (
              <ConsumersTab
                data={appUserData}
                isLoading={tabLoading.app_user}
                filters={appUserFilters}
                onFiltersChange={setAppUserFilters}
                _onRefetch={() => refetchTab('app_user')}
              />
            )}
          </AdminErrorBoundary>
        </div>
      </div>
    </div>
  );
}
