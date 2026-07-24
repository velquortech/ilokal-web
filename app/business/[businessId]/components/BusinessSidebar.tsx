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
} from '@/components/custom/Nav';
import { Fragment } from 'react/jsx-runtime';
import { SIDEBAR_SECTIONS } from '../libs/configs/config';
import { UserMenu } from './UserMenu';
import { ProCard } from './ProCard';
import { GlobalSearch } from '@/components/custom/GlobalSearch';
import { useBusinessShop } from '@/providers/BusinessProvider';
import { businessPath } from '@/config/routeConfig';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { filterNavSections, hasNavResults } from '@/lib/utils/navSearch';

export function BusinessSidebar() {
  const { business, selectedBranchId } = useBusinessShop();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');

  const injectId = (href: string) => {
    if (!business?.id) return href;

    let resolved: string;
    if (href === '/business') resolved = businessPath(business.id);
    else if (href.startsWith('/business/'))
      resolved = href.replace('/business/', `/business/${business.id}/`);
    else resolved = href;

    // Preserve all current search params, ensuring branch param stays in sync
    const params = new URLSearchParams(searchParams.toString());
    if (selectedBranchId) {
      params.set('branch', selectedBranchId);
    } else {
      params.delete('branch');
    }
    const qs = params.toString();
    return qs ? `${resolved}?${qs}` : resolved;
  };

  const sections = SIDEBAR_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      href: item.href ? injectId(item.href) : item.href,
    })),
  }));

  const filteredSections = filterNavSections(sections, query);
  const noResults = query.trim().length > 0 && !hasNavResults(filteredSections);

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r">
      <SidebarHeader className="space-y-1 border-b px-4 py-3 group-data-[collapsible=icon]:px-2.5">
        <SidebarLogo shopName={business?.shop_name} logo={business?.logo_url} />
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto py-3">
        <SidebarGroup>
          <GlobalSearch value={query} onChange={setQuery} />
        </SidebarGroup>
        {filteredSections.map(({ items, header }, idx) => (
          <Fragment key={header ?? idx}>
            {header && <NavSectionHeader title={header} />}
            <NavSection items={items} disabled={!business} />
          </Fragment>
        ))}
        {noResults && (
          <p className="text-muted-foreground px-4 py-2 text-sm group-data-[collapsible=icon]:hidden">
            No results for &ldquo;{query.trim()}&rdquo;
          </p>
        )}
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
