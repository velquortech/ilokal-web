'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  SidebarLogo,
  NavSection,
  NavSectionHeader,
} from '../../../components/custom/Nav';
import { Separator } from '@/components/ui/separator';
import { Fragment } from 'react/jsx-runtime';
import { SIDEBAR_SECTIONS } from '../libs/configs/config';
import { UserMenu } from './UserMenu';
import { ProCard } from './ProCard';

export function BusinessSidebar() {
  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
      <SidebarLogo />
      <SidebarContent className="overflow-y-auto py-3">
        {SIDEBAR_SECTIONS.map(({ items, header }, idx) => (
          <Fragment key={idx}>
            {header && <NavSectionHeader title={header} />}
            <NavSection items={items} />
            <Separator className="last:hidden" />
          </Fragment>
        ))}
      </SidebarContent>
      <div className="mt-auto p-3">
        <ProCard />
      </div>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
