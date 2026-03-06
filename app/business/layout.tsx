'use client';

import React from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { BusinessHeader, BusinessSidebar } from '@/app/business/components';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex h-screen">
      <SidebarProvider defaultOpen>
        <BusinessSidebar />
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          <BusinessHeader />
          <div className="flex-1 overflow-auto">
            <div className="p-10">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
