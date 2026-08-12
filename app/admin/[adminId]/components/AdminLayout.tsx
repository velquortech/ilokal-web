'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { UserProvider } from '@/providers/UserContext';
import { User } from '@/lib/types';

export default function AdminLayout({
  children,
  user,
  flags = {},
}: {
  children: React.ReactNode;
  user: User;
  /** `app_settings` kill switches, keyed as the nav config names them. */
  flags?: Record<string, boolean>;
}) {
  return (
    <UserProvider user={user}>
      <div className="bg-background flex h-screen overflow-hidden">
        <SidebarProvider
          defaultOpen={false}
          style={
            {
              '--sidebar-width': '18rem',
              '--sidebar-width-mobile': '18rem',
            } as React.CSSProperties
          }
        >
          <AdminSidebar flags={flags} />
          <SidebarInset className="flex flex-1 flex-col overflow-hidden">
            <AdminHeader />
            <div className="flex flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-10">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </UserProvider>
  );
}
