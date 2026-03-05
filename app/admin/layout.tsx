'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/app/admin/users/components/shared/Sidebar';
import { Header } from '@/app/admin/users/components/shared/Header';
import { adminNavItems } from '@/config/sidebarConfig';
import { useAuth } from '@/hooks/useAuth';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex min-h-screen w-screen bg-gray-50">
      <Sidebar
        items={adminNavItems}
        onLogout={handleLogout}
        appName="iLokal"
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
      />

      {/* Main content - adjusted for fixed sidebar, responsive */}
      <div className="flex flex-1 flex-col overflow-hidden md:ml-64">
        <Header
          userEmail={user?.email || 'user@example.com'}
          userFullName={user?.full_name || 'User'}
          userAvatar={user?.avatar_url || undefined}
          onLogout={handleLogout}
          showSearch={true}
          onMobileMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
