import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Lock,
  LucideIcon,
  LogOut,
} from 'lucide-react';
import { ROUTES } from '@/config/routesConfig';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const adminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD.ADMIN,
    icon: LayoutDashboard,
    description: 'Overview and analytics',
  },
  {
    label: 'User Management',
    href: `${ROUTES.DASHBOARD.ADMIN}/users`,
    icon: Users,
    description: 'Manage system users',
  },
  {
    label: 'Business Profiles',
    href: `${ROUTES.DASHBOARD.ADMIN}/businesses`,
    icon: Building2,
    description: 'View business details',
  },
  {
    label: 'Documents',
    href: `${ROUTES.DASHBOARD.ADMIN}/documents`,
    icon: FileText,
    description: 'Manage documents',
  },
  {
    label: 'Account Status',
    href: `${ROUTES.DASHBOARD.ADMIN}/account-status`,
    icon: Lock,
    description: 'Account security',
  },
];

export const businessNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD.BUSINESS,
    icon: LayoutDashboard,
    description: 'Overview',
  },
  {
    label: 'Branches',
    href: `${ROUTES.DASHBOARD.BUSINESS}/branches`,
    icon: Building2,
    description: 'Manage branches',
  },
  {
    label: 'Products',
    href: `${ROUTES.DASHBOARD.BUSINESS}/products`,
    icon: FileText,
    description: 'Manage products',
  },
];

export const userNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard/user',
    icon: LayoutDashboard,
    description: 'Overview',
  },
  {
    label: 'My Profile',
    href: '/dashboard/user/profile',
    icon: Users,
    description: 'Profile settings',
  },
];

export const logoutItem: NavItem = {
  label: 'Logout',
  href: ROUTES.AUTH.LOGIN,
  icon: LogOut,
  description: 'Sign out of your account',
};
