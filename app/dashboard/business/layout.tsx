'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/custom/Sidebar';
import { businessNavItems, logoutItem } from '@/config/sidebarConfig';

export default function BusinessDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    router.push('/auth/login');
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
      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
