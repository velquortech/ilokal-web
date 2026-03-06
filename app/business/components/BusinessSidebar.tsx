'use client';

import { Sidebar, SidebarContent, SidebarRail } from '@/components/ui/sidebar';
import {
  SidebarLogo,
  NavSection,
  NavSectionHeader,
  NavFooter,
} from '../../../components/custom/Nav';
import { Separator } from '@/components/ui/separator';
import { Fragment } from 'react/jsx-runtime';
import { SIDEBAR_SECTIONS } from '../libs/configs/config';

export function BusinessSidebar() {
  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
      <SidebarLogo />
      <SidebarContent className="overflow-y-auto">
        {SIDEBAR_SECTIONS.map(({ items, header, icon }, idx) => (
          <Fragment key={idx}>
            {header && icon && <NavSectionHeader icon={icon} title={header} />}
            <NavSection items={items} />
            <Separator className="last:hidden" />
          </Fragment>
        ))}
      </SidebarContent>
      <NavFooter />
      <SidebarRail />
    </Sidebar>
  );
}
