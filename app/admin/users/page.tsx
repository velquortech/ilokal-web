'use client';

import { useState } from 'react';
import { USER_MANAGEMENT_TABS } from '../config/tabsConfig';
import { AdminErrorBoundary } from '../components/shared/AdminErrorBoundary';

export default function UserManagementHub() {
  const [activeTab, setActiveTab] = useState('admins');

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
              onClick={() => setActiveTab(tab.id)}
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
        {USER_MANAGEMENT_TABS.map(
          (tab) =>
            activeTab === tab.id &&
            tab.component && (
              <div key={tab.id} className="mt-4 space-y-4">
                <AdminErrorBoundary>{tab.component}</AdminErrorBoundary>
              </div>
            ),
        )}
      </div>
    </div>
  );
}
