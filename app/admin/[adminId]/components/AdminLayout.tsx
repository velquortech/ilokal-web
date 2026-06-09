'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { UserProvider } from '@/providers/UserContext';
import { User } from '@/lib/types';

export default function AdminLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User;
}) {
  return (
    <UserProvider user={user}>
      <div className="bg-background font-geist flex h-screen overflow-hidden">
        <SidebarProvider
          defaultOpen={false}
          style={
            {
              '--sidebar-width': '18rem',
              '--sidebar-width-mobile': '18rem',
            } as React.CSSProperties
          }
        >
          <AdminSidebar />
          <SidebarInset className="flex flex-1 flex-col overflow-hidden">
            <AdminHeader />
            <div className="flex flex-1 overflow-auto px-10 py-6">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </UserProvider>
  );
}
