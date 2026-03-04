'use client';

import { useState } from 'react';
import { Shield, Building2, Users } from 'lucide-react';
import { AdminTab, ConsumersTab } from './components';

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
        <div className="-cols-3 flex w-full max-w-md border-b border-gray-200">
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'admins'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span
              className={
                activeTab === 'admins' ? 'text-blue-600' : 'text-gray-600'
              }
            >
              Admins
            </span>
          </button>
          <button
            onClick={() => setActiveTab('business-owners')}
            className={`flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'business-owners'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span
              className={
                'block' +
                (activeTab === 'business-owners'
                  ? ' text-blue-600'
                  : ' text-gray-600')
              }
            >
              Business Owners
            </span>
          </button>
          <button
            onClick={() => setActiveTab('consumers')}
            className={`flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'consumers'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span
              className={
                activeTab === 'consumers' ? 'text-blue-600' : 'text-gray-600'
              }
            >
              Consumers
            </span>
          </button>
        </div>

        {/* Admin Tab */}
        {activeTab === 'admins' && (
          <div className="mt-4 space-y-4">
            <AdminTab />
          </div>
        )}

        {/* Business Owners Tab */}
        {/* {activeTab === 'business-owners' && (
          <div className="mt-4 space-y-4">
            <BusinessOwnersTab />
          </div>
        )} */}

        {/* Consumers Tab */}
        {activeTab === 'consumers' && (
          <div className="mt-4 space-y-4">
            <ConsumersTab />
          </div>
        )}
      </div>
    </div>
  );
}
