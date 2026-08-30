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
  sidebarDefaultOpen = false,
}: {
  children: React.ReactNode;
  user: User;
  /** `app_settings` kill switches, keyed as the nav config names them. */
  flags?: Record<string, boolean>;
  /**
   * Seeded from the `sidebar_state` cookie by the server layout.
   *
   * `SidebarProvider` has always WRITTEN this cookie and, on the admin side,
   * nothing ever read it — so collapsing the sidebar never survived a reload.
   * The business shell fixed exactly this on 2026-08-06; this is the same fix,
   * sharing the same `config/sidebarCookie.ts` helper so the two cannot drift
   * on the cookie name.
   *
   * The admin default is CLOSED (unlike business, which defaults open): this
   * shell has a wide nav and the pages under it are tables that want the
   * horizontal room. `sidebarDefaultOpenClosedFirst` in the server layout
   * encodes that, so an admin who has never expressed a preference still gets
   * today's behaviour.
   */
  sidebarDefaultOpen?: boolean;
}) {
  return (
    <UserProvider user={user}>
      {/* `h-dvh`, not `h-screen`: 100vh is taller than the visible viewport on
          a phone while the browser URL bar is showing, so with this shell's
          `overflow-hidden` the bottom of the content column sits behind the
          browser chrome — unreachable on browsers whose URL bar never
          collapses (embedded webviews). dvh tracks the dynamic viewport
          instead; identical to vh on desktop. Same migration `BusinessLayout`
          and the registration wizard's layout already made. */}
      <div className="bg-background flex h-dvh overflow-hidden">
        <SidebarProvider
          defaultOpen={sidebarDefaultOpen}
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
