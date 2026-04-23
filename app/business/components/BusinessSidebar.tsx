'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
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
import { StatusBadge } from '@/components/custom/StatusBadge';

export function BusinessSidebar() {
  const { business } = useBusinessShop();
  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
      <div className="inline-flex items-center">
        <SidebarLogo />
        {business && <StatusBadge isVerified={business.is_verified} />}
      </div>

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
