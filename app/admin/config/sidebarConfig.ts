import {
  LayoutDashboard,
  Users,
  Building2,
  Lock,
  LucideIcon,
  LogOut,
  MapPin,
  ShoppingCart,
  Ticket,
  CreditCard,
  Package,
  BarChart3,
} from 'lucide-react';
import { ROUTES } from '@/config/routeConfig';

export interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  description?: string;
  children?: NavItem[];
  isSection?: boolean; // True if this is a group title
}

export const adminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD.ADMIN,
    icon: LayoutDashboard,
    description: 'Overview and analytics',
  },
  {
    label: 'Business Management',
    icon: Building2,
    description: 'Manage businesses and their content',
    isSection: true,
  },
  {
    label: 'Business Profiles',
    href: `${ROUTES.DASHBOARD.ADMIN}/businesses`,
    icon: Building2,
    description: 'Verify & manage business requests',
  },
  {
    label: 'Branches',
    href: `${ROUTES.DASHBOARD.ADMIN}/branches`,
    icon: MapPin,
    description: 'Manage business locations',
  },
  {
    label: 'Products',
    href: `${ROUTES.DASHBOARD.ADMIN}/products`,
    icon: ShoppingCart,
    description: 'View & manage products',
  },
  {
    label: 'Coupons & Deals',
    href: `${ROUTES.DASHBOARD.ADMIN}/coupons`,
    icon: Ticket,
    description: 'Manage promotions',
  },
  {
    label: 'Revenue & Billing',
    icon: CreditCard,
    description: 'Track payments and subscriptions',
    isSection: true,
  },
  {
    label: 'Payments',
    href: `${ROUTES.DASHBOARD.ADMIN}/payments`,
    icon: CreditCard,
    description: 'Track all transactions',
  },
  {
    label: 'Subscriptions',
    href: `${ROUTES.DASHBOARD.ADMIN}/subscriptions`,
    icon: Package,
    description: 'Manage subscription plans',
  },
  {
    label: 'Analytics',
    href: `${ROUTES.DASHBOARD.ADMIN}/analytics`,
    icon: BarChart3,
    description: 'View reports & metrics',
  },
  {
    label: 'System Management',
    icon: Users,
    description: 'Manage users and security',
    isSection: true,
  },
  {
    label: 'User Management',
    href: `${ROUTES.DASHBOARD.ADMIN}/users`,
    icon: Users,
    description: 'Manage system users',
  },
  {
    label: 'Account Status',
    href: `${ROUTES.DASHBOARD.ADMIN}/account-status`,
    icon: Lock,
    description: 'Account security',
  },
];

export const logoutItem: NavItem = {
  label: 'Logout',
  href: ROUTES.AUTH.LOGIN,
  icon: LogOut,
  description: 'Sign out of your account',
};
