'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  SidebarLogo,
  NavSection,
  NavSectionHeader,
} from '../../../components/custom/Nav';
import { Fragment } from 'react/jsx-runtime';
import { SIDEBAR_SECTIONS } from '../libs/configs/config';
import { UserMenu } from './UserMenu';
import { ProCard } from './ProCard';
import { GlobalSearch } from '@/components/custom/GlobalSearch';
import { useBusinessShop } from '@/providers/BusinessProvider';

export function BusinessSidebar() {
  const { business } = useBusinessShop();
  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
      <SidebarHeader className="space-y-1 border-b px-4 py-3 group-data-[collapsible=icon]:px-2.5">
        <SidebarLogo shopName={business?.shop_name} logo={business?.logo_url} />
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto py-3">
        <SidebarGroup>
          <GlobalSearch />
        </SidebarGroup>
        {SIDEBAR_SECTIONS.map(({ items, header }, idx) => (
          <Fragment key={idx}>
            {header && <NavSectionHeader title={header} />}
            <NavSection items={items} />
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
