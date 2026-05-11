'use client';

import { useState } from 'react';
import { USER_MANAGEMENT_TABS } from '../config/tabsConfig';
import { AdminErrorBoundary } from '../components/shared/AdminErrorBoundary';
import { useUserTabsData } from './hooks/useUserTabsData';
import { AdminTab, BusinessOwnerTab, ConsumersTab } from './tabs';
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
  const { adminData, businessOwnerData, appUserData, tabLoading, refetchTab } =
    useUserTabsData(
      activeRole,
      adminFilters,
      businessOwnerFilters,
      appUserFilters,
    );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-gray-600">
          Manage admins, business owners, and user accounts
        </p>
      </div>
      {/* Tabs */}
      <div>
        <div className="flex w-full max-w-2xl border-b border-gray-200">
          {USER_MANAGEMENT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex cursor-pointer items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span
                className={
                  activeTab === tab.id ? 'text-blue-600' : 'text-gray-600'
                }
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4 space-y-4">
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
