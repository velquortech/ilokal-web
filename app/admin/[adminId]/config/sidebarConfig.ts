import {
  LayoutDashboard,
  Users,
  Lock,
  MapPin,
  FileCheck,
  Settings,
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
