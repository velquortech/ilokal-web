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
import { SafeImage } from '@/components/custom/SafeImage';
import type { TourStepId } from '@/lib/onboarding/tourSteps';

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
  /**
   * Anchor for the onboarding tour, rendered as `data-tour` on this entry's
   * link. Typed as the step union rather than `string`, so renaming a step id
   * is a compile error here instead of a spotlight pointing at nothing.
   */
  tourId?: TourStepId;
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
    // `min-w-0` on BOTH this row and the text column below is what makes the
    // name shrink instead of overflowing. A flex item defaults to
    // `min-width: auto`, i.e. it refuses to get narrower than its content's
    // intrinsic width — so a long shop name pushed this row wider than the
    // sidebar and spilled over the page behind it, on top of the header's own
    // controls. `UserMenu` never had this bug because its text column is a
    // GRID item, where the default is `min-width: 0`.
    <div className="flex min-w-0 items-center gap-3">
      {logo ? (
        <div className="relative size-8 shrink-0 overflow-hidden rounded-lg group-data-[collapsible=icon]:size-7">
          {/* SafeImage: unoptimized storage WebP + broken-image fallback (a
              deleted logo would otherwise show the browser's broken glyph in
              the dashboard sidebar). */}
          <SafeImage
            src={logo}
            alt={shopName ?? 'Shop Logo'}
            width={32}
            height={32}
            className="aspect-square object-cover"
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
      <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
        <span
          // The full name, for the case two lines still cannot hold it.
          title={shopName}
          className={cn(
            // Two lines, not one. `truncate` was the original intent and it
            // could not work without the `min-w-0` above — but once it does,
            // it cuts "Stanley Pro Events and Management Services" at about
            // fifteen characters, which identifies nobody. The sidebar is
            // 18rem wide and the header has the vertical room, so two lines
            // then an ellipsis shows roughly forty. `break-words` covers the
            // other shape: one unbroken string longer than the column.
            'font-display leading-tight font-bold tracking-tight',
            'line-clamp-2 break-words',
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
        <Link
          href={item.href || '#'}
          aria-disabled={disabled}
          data-tour={item.tourId}
        >
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
