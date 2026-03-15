'use client';

import React, { useState, useCallback } from 'react';
import { Sidebar } from '@/app/admin/components/shared/Sidebar';
import { Header } from '@/app/admin/components/shared/Header';
import { adminNavItems } from '@/app/admin/config/sidebarConfig';
import { UserProvider } from '@/providers/UserContext';
import { User } from '@/lib/types/user';

interface AdminLayoutClientProps {
  user: User;
  children: React.ReactNode;
}

/**
 * Client Component for Admin Layout
 * Handles interactive UI state (sidebar toggle, logout)
 *
 * This is separated from the server layout to:
 * - Allow server-side user verification
 * - Keep interactivity client-side
 * - Enable proper streaming/Suspense boundaries
 * - Provide user context to nested components via UserProvider
 */
export function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    // Logout is handled via logoutAction in Header component
    // This callback is just for consistency
  }, []);

  return (
    <UserProvider user={user}>
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
            userEmail={user.email}
            userFullName={user.full_name || 'User'}
            userAvatar={user.avatar_url || undefined}
            onLogout={handleLogout}
            showSearch={true}
            onMobileMenuClick={() =>
              setIsMobileSidebarOpen(!isMobileSidebarOpen)
            }
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-8">{children}</div>
          </div>
        </div>
      </div>
    </UserProvider>
  );
}
