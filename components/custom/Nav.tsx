'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
} from '@/components/ui/sidebar';

import { LucideIcon } from 'lucide-react';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface NavSubItem {
  title: string;
  href: string;
  badge?: string;
  adminOnly?: boolean;
}

export interface NavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: BadgeVariant;
  adminOnly?: boolean;
  items?: NavSubItem[];
}

export interface NavSectionProps {
  items: NavItem[];
  label?: string;
}

function isItemActive(
  pathname: string,
  href?: string,
  subItems?: { href: string }[],
): boolean {
  if (href) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (subItems) {
    return subItems.some(
      (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`),
    );
  }
  return false;
}

interface SectionHeaderProps {
  title: string;
}

export function NavSectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="mx-3 flex items-center gap-2 group-data-[collapsible=icon]:hidden">
      <span className="text-secondary-foreground text-xs font-semibold">
        {title}
      </span>
    </div>
  );
}

export function SidebarLogo() {
  return (
    <SidebarHeader className="border-b px-4 py-3 group-data-[collapsible=icon]:px-2.5">
      <div className="flex items-center gap-3">
        <div className="bg-primary shadow-primary/20 flex size-8 shrink-0 items-center justify-center rounded-lg shadow-lg group-data-[collapsible=icon]:size-7">
          <Store className="text-primary-foreground size-4" />
        </div>
        <div className="flex flex-col group-data-[collapsible=icon]:hidden">
          <span className="text-sm font-semibold">iLokal Business</span>
          <span className="text-muted-foreground text-xs">Admin</span>
        </div>
      </div>
    </SidebarHeader>
  );
}

function isSubItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavItemIconProps {
  icon: LucideIcon;
  highlight?: boolean;
}

function NavItemIcon({ icon: Icon }: NavItemIconProps) {
  return <Icon className={cn('h-4 w-4')} />;
}

interface NavItemBadgeProps {
  badge: string;
  variant?: BadgeVariant;
}

function NavItemBadge({ badge, variant = 'default' }: NavItemBadgeProps) {
  return (
    <Badge
      variant={variant}
      className="ml-1 aspect-square size-5 text-[clamp(0.5rem,1vw,0.6rem)]"
    >
      {badge}
    </Badge>
  );
}

interface NavSubItemsProps {
  items: NavSubItem[];
  pathname: string;
}

function NavSubItems({ items, pathname }: NavSubItemsProps) {
  return (
    <SidebarMenuSub>
      {items.map((subItem) => {
        const isSubActive = isSubItemActive(pathname, subItem.href);
        return (
          <SidebarMenuSubItem key={subItem.title}>
            <SidebarMenuSubButton asChild isActive={isSubActive}>
              <Link href={subItem.href}>
                <span>{subItem.title}</span>
                {subItem.badge && (
                  <NavItemBadge badge={subItem.badge} variant="secondary" />
                )}
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      })}
    </SidebarMenuSub>
  );
}

interface CollapsibleNavItemProps {
  item: NavItem;
  isActive: boolean;
  pathname: string;
}

function CollapsibleNavItem({
  item,
  isActive,
  pathname,
}: CollapsibleNavItemProps) {
  return (
    <Collapsible defaultOpen={isActive}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isActive} tooltip={item.title}>
            <NavItemIcon icon={item.icon} />
            <span>{item.title}</span>
            {item.badge && (
              <NavItemBadge badge={item.badge} variant={item.badgeVariant} />
            )}
            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <NavSubItems items={item.items!} pathname={pathname} />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

interface SimpleNavItemProps {
  item: NavItem;
  isActive: boolean;
}

function SimpleNavItem({ item, isActive }: SimpleNavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link href={item.href || '#'}>
          <NavItemIcon icon={item.icon} />
          <span>{item.title}</span>
          {item.badge && (
            <NavItemBadge badge={item.badge} variant={item.badgeVariant} />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function NavSection({ items, label }: NavSectionProps) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = isItemActive(pathname, item.href, item.items);

            if (item.items) {
              return (
                <CollapsibleNavItem
                  key={item.title}
                  item={item}
                  isActive={isActive}
                  pathname={pathname}
                />
              );
            }

            return (
              <SimpleNavItem key={item.title} item={item} isActive={isActive} />
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
