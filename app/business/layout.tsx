'use client';

import React, { useEffect, useState } from 'react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {
  BusinessHeader,
  BusinessSidebar,
  AIChatSheet,
} from '@/app/business/components';
import { cn } from '@/lib/utils';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  useEffect(() => {
    if (isAIChatOpen) {
      document.body.classList.add('ai-chat-sheet-open');
    } else {
      document.body.classList.remove('ai-chat-sheet-open');
    }
  }, [isAIChatOpen]);

  return (
    <div className="bg-background font-geist flex h-screen overflow-hidden">
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
          <BusinessHeader
            onAIChatClick={() => setIsAIChatOpen((prev) => !prev)}
          />
          <div className="flex-1 overflow-auto">
            <div className={`p-10 transition-all duration-300 ease-in-out`}>
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <div className={cn('w-0 transition-all', isAIChatOpen && 'w-lg p-2')}>
        <AIChatSheet />
      </div>
    </div>
  );
}
