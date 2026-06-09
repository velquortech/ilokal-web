'use client';

import { Fragment } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NavSection, NavSectionHeader } from '@/components/custom/Nav';
import { SIDEBAR_SECTIONS, injectAdminId } from '../config/sidebarConfig';
import { AdminUserMenu } from './AdminUserMenu';
import { useAdmin } from '@/providers/AdminProvider';

function AdminLogo() {
  return (
    <div className="font-giest flex items-center gap-3">
      <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg group-data-[collapsible=icon]:size-7">
        <ShieldCheck className="size-4" />
      </div>
      <div className="flex flex-col group-data-[collapsible=icon]:hidden">
        <span className="font-semibold">iLokal</span>
        <span className="text-secondary-foreground text-xs">Admin</span>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const { adminId } = useAdmin();

  const sections = SIDEBAR_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      href: item.href ? injectAdminId(item.href, adminId) : item.href,
    })),
  }));

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
      <SidebarHeader className="space-y-1 border-b px-4 py-3 group-data-[collapsible=icon]:px-2.5">
        <AdminLogo />
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto py-3">
        {sections.map(({ items, header }, idx) => (
          <Fragment key={idx}>
            {header && <NavSectionHeader title={header} />}
            <NavSection items={items} />
          </Fragment>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <AdminUserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
