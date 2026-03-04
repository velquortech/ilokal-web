import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Lock,
  LucideIcon,
  LogOut,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const adminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
    description: 'Overview and analytics',
  },
  {
    label: 'User Management',
    href: '/dashboard/admin/users',
    icon: Users,
    description: 'Manage system users',
  },
  {
    label: 'Business Profiles',
    href: '/dashboard/businesses',
    icon: Building2,
    description: 'View business details',
  },
  {
    label: 'Documents',
    href: '/dashboard/documents',
    icon: FileText,
    description: 'Manage documents',
  },
  {
    label: 'Account Status',
    href: '/dashboard/account-status',
    icon: Lock,
    description: 'Account security',
  },
];

export const businessNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard/business',
    icon: LayoutDashboard,
    description: 'Overview',
  },
  {
    label: 'Branches',
    href: '/dashboard/business/branches',
    icon: Building2,
    description: 'Manage branches',
  },
  {
    label: 'Products',
    href: '/dashboard/business/products',
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
  href: '/auth/login',
  icon: LogOut,
  description: 'Sign out of your account',
};
