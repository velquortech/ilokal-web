'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { NotificationBell } from '@/components/custom/NotificationBell';

export function AdminHeader() {
  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4">
        <div className="flex flex-1 items-center gap-4">
          <SidebarTrigger className="h-9 w-9" />
        </div>

        <div className="flex items-center gap-1">
          {/* The same component the business header mounts. It reads
              `getCurrentUser()` and RLS scopes the rows, so an admin sees
              admin-addressed notifications and nothing else — no admin-only
              bell, no second inbox, no forked query layer. */}
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
