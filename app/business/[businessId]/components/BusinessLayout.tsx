'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { BusinessHeader, BusinessSidebar, AIChatSheet } from '.';
import { AIChatProvider } from './AIChatSheet';
import { User } from '@/lib/types';
import { UserProvider } from '@/providers/UserContext';
import {
  BusinessShop,
  BusinessShopProvider,
} from '@/providers/BusinessProvider';
import { ShopPendingBanner } from '../home/components/PendingBanner';

export default function BusinessLayout({
  children,
  user,
  shop,
}: {
  children: React.ReactNode;
  user: User;
  shop?: BusinessShop | null;
}) {
  return (
    <UserProvider user={user}>
      <BusinessShopProvider businessShop={shop}>
        <div className="bg-background font-geist flex h-screen overflow-hidden">
          <AIChatProvider>
            <SidebarProvider
              defaultOpen
              style={
                {
                  '--sidebar-width': '18rem',
                  '--sidebar-width-mobile': '18rem',
                } as React.CSSProperties
              }
            >
              <BusinessSidebar />
              <SidebarInset className="flex flex-1 flex-col overflow-hidden">
                <BusinessHeader />
                {shop?.status === 'pending' && (
                  <div className="px-3 pt-3 pb-1">
                    <ShopPendingBanner />
                  </div>
                )}
                <div className="flex flex-1 overflow-auto px-10 py-6">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
            <AIChatSheet />
          </AIChatProvider>
        </div>
      </BusinessShopProvider>
    </UserProvider>
  );
}
