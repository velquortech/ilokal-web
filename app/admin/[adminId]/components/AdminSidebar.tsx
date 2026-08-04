'use client';

import { Fragment } from 'react';
import { BrandMark, BrandWordmark } from '@/components/custom/BrandLogo';
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
      <BrandMark size={32} className="group-data-[collapsible=icon]:size-7" />
      <div className="flex flex-col group-data-[collapsible=icon]:hidden">
        <BrandWordmark className="text-primary leading-tight" />
        <span className="text-secondary-foreground text-xs">Admin</span>
      </div>
    </div>
  );
}

export function AdminSidebar({
  flags = {},
}: {
  /**
   * `app_settings` kill switches, keyed as the nav config names them. Same
   * contract as `BusinessSidebar` — an entry whose `flag` is not true here is
   * not rendered, because its route 404s.
   */
  flags?: Record<string, boolean>;
}) {
  const { adminId } = useAdmin();

  const sections = SIDEBAR_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => !item.flag || flags[item.flag] === true)
      .map((item) => ({
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
