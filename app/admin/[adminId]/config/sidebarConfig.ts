import {
  LayoutDashboard,
  Users,
  Lock,
  MapPin,
  FileCheck,
  CalendarDays,
  MailWarning,
  Settings,
  Sparkles,
  Star,
  Tags,
} from 'lucide-react';
import { NavItem } from '@/components/custom/Nav';

/**
 * Admin sidebar navigation.
 *
 * Hrefs are stored as **base paths** (`/admin`, `/admin/<page>`) and the
 * concrete `adminId` is injected at render time by `AdminSidebar` (mirrors how
 * `BusinessSidebar` injects `businessId`). Keep this file free of the dynamic
 * segment so it stays a pure, testable config.
 */

export const mainNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Business Documents',
    href: '/admin/businesses',
    icon: FileCheck,
  },
  {
    title: 'Branch Applications',
    href: '/admin/branches',
    icon: MapPin,
  },
  {
    // Not "Event Proposals" any more: the page also authors staff picks, which
    // are nobody's proposal.
    title: 'Events',
    href: '/admin/events',
    icon: CalendarDays,
    flag: 'enable_events',
  },
  {
    title: 'Menu Follow-up',
    href: '/admin/menu-follow-up',
    icon: MailWarning,
  },
  {
    title: 'Welcome Posts',
    href: '/admin/welcome-posts',
    icon: Sparkles,
  },
  {
    title: 'Bida of the Day',
    href: '/admin/bida-of-the-day',
    icon: Star,
  },
  {
    title: 'Categories',
    href: '/admin/categories',
    icon: Tags,
  },
];

export const administrationNavigation: NavItem[] = [
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Account Status',
    href: '/admin/account-status',
    icon: Lock,
  },
  {
    title: 'Platform Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export const sectionHeaders = {
  administration: 'Administration',
};

export const SIDEBAR_SECTIONS: {
  items: NavItem[];
  header?: string;
}[] = [
  {
    items: mainNavigation,
  },
  {
    items: administrationNavigation,
    header: sectionHeaders.administration,
  },
];

/**
 * Rewrite a base admin href to include the dynamic `[adminId]` segment.
 * Leaves external / non-admin hrefs untouched.
 */
export function injectAdminId(href: string, adminId: string): string {
  if (!adminId) return href;
  if (href === '/admin') return `/admin/${adminId}`;
  if (href.startsWith('/admin/'))
    return href.replace('/admin/', `/admin/${adminId}/`);
  return href;
}
