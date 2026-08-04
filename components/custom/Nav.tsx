'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { brandToneFor } from '@/lib/utils/brandTone';
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
} from '@/components/ui/sidebar';

import { LucideIcon } from 'lucide-react';
import Image from 'next/image';

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
  /**
   * The `app_settings` kill switch this entry belongs to. The route 404s when
   * the flag is off, so the nav must not advertise it. Named here rather than
   * matched by href in the sidebar — one hardcoded `endsWith()` per feature is
   * how a nav entry ends up pointing at a route nobody can open.
   */
  flag?: string;
  items?: NavSubItem[];
}

export interface NavSectionProps {
  items: NavItem[];
  label?: string;
  disabled?: boolean;
}

function isItemActive(
  pathname: string,
  href?: string,
  subItems?: { href: string }[],
): boolean {
  if (href) {
    return pathname === href;
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

/**
 * The shop's own identity, at the top of its dashboard.
 *
 * A shop with no logo used to get a grey **warning triangle** — the icon this
 * app uses for "something is wrong" — so most shops opened their dashboard to
 * what looked like an error next to their name. A missing logo is not a fault;
 * it now gets the same id-derived brand tone and initial the shop wears on
 * `/explore`, which also means the owner sees their public colour here.
 *
 * The triangle is kept for the genuinely broken case: no shop at all
 * (registration unfinished), where a warning is the correct signal.
 */
export function SidebarLogo({
  shopName,
  logo,
  businessId,
}: {
  shopName?: string;
  logo?: string;
  businessId?: string;
}) {
  const initial = shopName?.trim()[0]?.toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {logo ? (
        <div className="relative size-8 shrink-0 overflow-hidden rounded-lg group-data-[collapsible=icon]:size-7">
          <Image
            src={logo}
            alt={shopName ?? 'Shop Logo'}
            width={32}
            height={32}
            className="aspect-square object-cover"
            unoptimized
          />
        </div>
      ) : shopName ? (
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg group-data-[collapsible=icon]:size-7',
            brandToneFor(businessId ?? shopName),
          )}
        >
          <span className="font-display text-sm leading-none font-bold">
            {initial}
          </span>
        </div>
      ) : (
        <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg group-data-[collapsible=icon]:size-7">
          <AlertTriangle className="size-4" />
        </div>
      )}
      <div className="flex flex-col group-data-[collapsible=icon]:hidden">
        <span
          className={cn(
            'font-display truncate leading-tight font-bold tracking-tight',
            !shopName && 'text-muted-foreground font-normal',
          )}
        >
          {shopName ?? 'Unregistered'}
        </span>
      </div>
    </div>
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
  disabled?: boolean;
}

function NavSubItems({ items, pathname, disabled = false }: NavSubItemsProps) {
  return (
    <SidebarMenuSub>
      {items.map((subItem) => {
        const isSubActive = isSubItemActive(pathname, subItem.href);
        return (
          <SidebarMenuSubItem key={subItem.title}>
            <SidebarMenuSubButton asChild isActive={isSubActive}>
              <Link
                href={disabled ? '#' : subItem.href}
                aria-disabled={disabled}
              >
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
  disabled?: boolean;
}

function CollapsibleNavItem({
  item,
  isActive,
  pathname,
  disabled = false,
}: CollapsibleNavItemProps) {
  return (
    <Collapsible defaultOpen={isActive}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={item.title}
            disabled={disabled}
          >
            <NavItemIcon icon={item.icon} />
            <span>{item.title}</span>
            {item.badge && (
              <NavItemBadge badge={item.badge} variant={item.badgeVariant} />
            )}
            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <NavSubItems
            items={item.items!}
            pathname={pathname}
            disabled={disabled}
          />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

interface SimpleNavItemProps {
  item: NavItem;
  isActive: boolean;
  disabled?: boolean;
}

function SimpleNavItem({
  item,
  isActive,
  disabled = false,
}: SimpleNavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        disabled={disabled}
      >
        <Link href={item.href || '#'} aria-disabled={disabled}>
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

export function NavSection({
  items,
  label,
  disabled = false,
}: NavSectionProps) {
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
                  disabled={disabled}
                />
              );
            }

            return (
              <SimpleNavItem
                key={item.title}
                item={item}
                isActive={isActive}
                disabled={disabled}
              />
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
