'use client';

import React from 'react';
import { Sidebar } from '@/components/custom/Sidebar';
import { Header } from '@/components/custom/Header';
import { adminNavItems } from '@/config/sidebarConfig';
import { useAuth } from '@/hooks/useAuth';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex min-h-screen w-screen bg-gray-50">
      <Sidebar items={adminNavItems} onLogout={handleLogout} appName="iLokal" />

      {/* Main content - adjusted for fixed sidebar */}
      <div className="ml-64 flex flex-1 flex-col overflow-hidden">
        <Header
          userEmail={user?.email || 'user@example.com'}
          userFullName={user?.full_name || 'User'}
          userAvatar={user?.avatar_url || undefined}
          onLogout={handleLogout}
          showSearch={true}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
