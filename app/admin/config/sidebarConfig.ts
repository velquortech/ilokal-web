import {
  LayoutDashboard,
  Users,
  // Building2,
  Lock,
  LucideIcon,
  LogOut,
  // MapPin,
  // ShoppingCart,
  // Ticket,
  // CreditCard,
  // Package,
  // BarChart3,
} from 'lucide-react';
import { ROUTES } from '@/config/routeConfig';

export interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  description?: string;
  children?: NavItem[];
  isSection?: boolean;
}

export const adminNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD.ADMIN,
    icon: LayoutDashboard,
    description: 'Platform overview and analytics',
  },
  // {
  //   label: 'Business Management',
  //   icon: Building2,
  //   description: 'Manage business accounts and verification',
  //   isSection: true,
  // },
  // {
  //   label: 'Business Profiles',
  //   href: `${ROUTES.DASHBOARD.ADMIN}/businesses`,
  //   icon: Building2,
  //   description: 'Verify & manage business requests',
  // },
  // {
  //   label: 'Content Moderation',
  //   icon: ShoppingCart,
  //   description: 'Monitor and moderate business content',
  //   isSection: true,
  // },
  // {
  //   label: 'Products',
  //   href: `${ROUTES.DASHBOARD.ADMIN}/moderation/products`,
  //   icon: ShoppingCart,
  //   description: 'Monitor & flag inappropriate products',
  // },
  // {
  //   label: 'Branches',
  //   href: `${ROUTES.DASHBOARD.ADMIN}/moderation/branches`,
  //   icon: MapPin,
  //   description: 'Monitor branch activity & suspend if needed',
  // },
  // {
  //   label: 'Coupons & Deals',
  //   href: `${ROUTES.DASHBOARD.ADMIN}/moderation/coupons`,
  //   icon: Ticket,
  //   description: 'Review and moderate promotional offers',
  // },
  // {
  //   label: 'Platform Operations',
  //   icon: CreditCard,
  //   description: 'Revenue and platform-level features',
  //   isSection: true,
  // },
  // {
  //   label: 'Payments & Revenue',
  //   href: `${ROUTES.DASHBOARD.ADMIN}/payments`,
  //   icon: CreditCard,
  //   description: 'Track transactions and revenue',
  // },
  // {
  //   label: 'Featured Deals',
  //   href: `${ROUTES.DASHBOARD.ADMIN}/featured-deals`,
  //   icon: Ticket,
  //   description: 'Create platform-wide promotions',
  // },
  // {
  //   label: 'Subscriptions',
  //   href: `${ROUTES.DASHBOARD.ADMIN}/subscriptions`,
  //   icon: Package,
  //   description: 'Manage subscription plans',
  // },
  // {
  //   label: 'Analytics & Reports',
  //   href: `${ROUTES.DASHBOARD.ADMIN}/analytics`,
  //   icon: BarChart3,
  //   description: 'View platform metrics & insights',
  // },
  {
    label: 'Administration',
    icon: Users,
    description: 'Manage admin accounts and security',
    isSection: true,
  },
  {
    label: 'User Management',
    href: `${ROUTES.DASHBOARD.ADMIN}/users`,
    icon: Users,
    description: 'Manage admin, business owner, and app user accounts',
  },
  {
    label: 'Account Status',
    href: `${ROUTES.DASHBOARD.ADMIN}/account-status`,
    icon: Lock,
    description: 'Manage account security & suspension',
  },
];

export const logoutItem: NavItem = {
  label: 'Logout',
  href: ROUTES.AUTH.LOGIN,
  icon: LogOut,
  description: 'Sign out of your account',
};
