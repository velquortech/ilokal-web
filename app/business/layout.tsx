'use client';

import React from 'react';
import { Sidebar } from '@/components/custom/Sidebar';
import { Header } from '@/components/custom/Header';
import { businessNavItems, logoutItem } from '@/config/sidebarConfig';
import { useAuth } from '@/hooks/useAuth';

export default function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        items={businessNavItems}
        logoutItem={logoutItem}
        onLogout={handleLogout}
        appName="iLokal"
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={user?.email || 'user@example.com'}
          userFullName={user?.full_name || 'User'}
          userAvatar={user?.avatar_url || undefined}
          onLogout={handleLogout}
          showSearch={true}
        />
        <div className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
