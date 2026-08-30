'use client';

import { cn } from '@/lib/utils';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { BrandMark } from '@/components/custom/BrandLogo';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { NotificationBell } from '@/components/custom/NotificationBell';

export function AdminHeader() {
  // Hydration-safe: seeded from the `sidebar_state` cookie on the server, so
  // the first client render agrees with the server HTML.
  const { state } = useSidebar();

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* 44px on touch, 36px from md up. Below `md` the sidebar is a
              `Sheet` that starts closed, so this button is the ONLY way to
              reach navigation — a 36px target for the single most important
              control on a phone is the defect the business header already
              fixed. */}
          <SidebarTrigger className="h-11 w-11 md:h-9 md:w-9" />

          {/* Platform identity. The sidebar's own header prints the lockup,
              but it is off-screen exactly when it is most needed: on mobile
              (the sheet is closed by default) and on desktop while the rail is
              collapsed — which is the admin default. Without this an admin on
              a phone sees a hamburger, a bell and a theme toggle, and nothing
              saying which product they are in. Same md:/collapsed rule the
              business header uses, so one display utility is present at a time
              and there is no cascade to fight. */}
          <div
            data-testid="admin-header-identity"
            className={cn(
              'flex min-w-0 items-center gap-2',
              state === 'collapsed' ? 'md:flex' : 'md:hidden',
            )}
          >
            <BrandMark size={24} className="shrink-0" />
            <span className="font-display min-w-0 truncate text-base leading-none font-bold tracking-tight">
              Admin
            </span>
          </div>
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
