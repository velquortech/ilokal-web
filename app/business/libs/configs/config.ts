import {
  Store,
  TrendingUp,
  BarChart3,
  Megaphone,
  Ticket,
  Gift,
  MessageSquare,
  Star,
  Settings,
  HelpCircle,
  Sparkles,
  Zap,
  Users,
  Bell,
  Building2,
  // Building,
  MapPin,
  Layers,
  Home,
  ShoppingBasket,
} from 'lucide-react';
import { NavItem } from '@/components/custom/Nav';
import { QuickAction } from '@/components/custom/ActionButton';

export const mainNavigation: NavItem[] = [
  {
    title: 'Home',
    href: '/business',
    icon: Home,
  },
];

// export const branchNavigation: NavItem[] = [
//   {
//     title: 'All Branches',
//     href: '/business/branches',
//     icon: Building2,
//     adminOnly: true,
//   },
//   {
//     title: 'Branch Management',
//     icon: Building,
//     adminOnly: true,
//     items: [
//       { title: 'Create Branch', href: '/business/branches/create' },
//       {
//         title: 'Branch List',
//         href: '/business/branches/list',
//         adminOnly: true,
//       },
//       { title: 'Branch Settings', href: '/business/branches/settings' },
//       { title: 'Staff & Roles', href: '/business/branches/staff' },
//     ],
//   },
//   {
//     title: 'Current Branch',
//     icon: MapPin,
//     items: [
//       { title: 'Overview', href: '/business/branch/overview' },
//       { title: 'Performance', href: '/business/branch/performance' },
//       { title: 'Staff', href: '/business/branch/staff' },
//     ],
//   },
// ];

export const storeNavigation: NavItem[] = [
  {
    title: 'My Shop',
    href: '/business/shop',
    icon: Store,
  },
  {
    title: 'Store Management',
    icon: ShoppingBasket,
    items: [
      { title: 'Menu & Services', href: '/store/menu' },
      { title: 'Operating Hours', href: '/store/hours' },
      { title: 'Settings', href: '/store/settings' },
    ],
  },
];

export const marketingNavigation: NavItem[] = [
  {
    title: 'Marketing Hub',
    icon: Sparkles,

    items: [
      { title: 'Overview', href: '/business/marketing' },
      { title: 'Promotions', href: '/business/marketing/promotions' },
    ],
  },
  {
    title: 'Vouchers & Coupons',
    icon: Ticket,

    items: [
      { title: 'All Vouchers', href: '/business/vouchers' },
      { title: 'Create Voucher', href: '/business/vouchers/create' },
      { title: 'Auto-Apply Rules', href: '/business/vouchers/rules' },
      { title: 'Redemption History', href: '/business/vouchers/history' },
    ],
  },
  {
    title: 'Campaigns',
    icon: Megaphone,

    items: [
      { title: 'Active Campaigns', href: '/business/campaigns' },
      { title: 'Create Campaign', href: '/business/campaigns/create' },
      { title: 'Email Marketing', href: '/business/campaigns/email' },
      { title: 'SMS Marketing', href: '/business/campaigns/sms' },
    ],
  },
  {
    title: 'Loyalty Program',
    icon: Gift,
    items: [
      { title: 'Program Settings', href: '/business/loyalty' },
      { title: 'Rewards Catalog', href: '/business/loyalty/rewards' },
      { title: 'Member List', href: '/business/loyalty/members' },
    ],
  },
  {
    title: 'Reviews & Ratings',
    href: '/business/reviews',
    icon: Star,
    items: [
      { title: 'All Reviews', href: '/business/reviews' },
      { title: 'Pending Reply', href: '/business/reviews/pending' },
      { title: 'Review Analytics', href: '/business/reviews/analytics' },
    ],
  },
];

export const analyticsNavigation: NavItem[] = [
  {
    title: 'Analytics Dashboard',
    href: '/business/analytics',
    icon: TrendingUp,
  },
  {
    title: 'Reports',
    icon: BarChart3,

    items: [
      { title: 'Sales Reports', href: '/business/reports/sales' },
      { title: 'Product Reports', href: '/business/reports/products' },
      { title: 'Customer Reports', href: '/business/reports/customers' },
      { title: 'Marketing Reports', href: '/business/reports/marketing' },
      { title: 'Financial Reports', href: '/business/reports/financial' },
      { title: 'Export Reports', href: '/business/reports/export' },
    ],
  },
  {
    title: 'Multi-Branch Analytics',
    icon: Layers,
    adminOnly: true,
    items: [
      {
        title: 'Overview (All Branches)',
        href: '/business/analytics/all-branches',
        adminOnly: true,
      },
      {
        title: 'Branch Comparison',
        href: '/business/analytics/comparison',
        adminOnly: true,
      },
      {
        title: 'Performance by Location',
        href: '/business/analytics/by-location',
        adminOnly: true,
      },
    ],
  },
  {
    title: 'Customer Insights',
    icon: Users,
    items: [
      { title: 'Customer List', href: '/business/customers' },
      { title: 'Segments', href: '/business/customers/segments' },
      { title: 'Behavior Analytics', href: '/business/customers/behavior' },
    ],
  },
];

export const footerNavigation: NavItem[] = [
  {
    title: 'Settings',
    href: '/business/settings',
    icon: Settings,
  },
  {
    title: 'Help & Support',
    href: '/business/help',
    icon: HelpCircle,
  },
];

export const branchManagerNavigation: NavItem[] = [
  {
    title: 'Branch Overview',
    href: '/business/branch/overview',
    icon: MapPin,
  },
  {
    title: 'Branch Analytics',
    href: '/business/branch/analytics',
    icon: BarChart3,
  },
];

export const sectionheaders = {
  store: 'Store Management',
  communication: 'Communication',
  finance: 'Finance',
  marketing: 'Marketing & Growth',
  analytics: 'Analytics & Reports',
};

export const sectionIcons = {
  marketing: Zap,
  analytics: BarChart3,
  branch: Building2,
  currentBranch: MapPin,
};

export const SIDEBAR_SECTIONS: {
  items: NavItem[];
  header?: string;
}[] = [
  {
    items: mainNavigation,
  },
  // {
  //   items: branchNavigation,
  //   header: 'Branch Management',
  // },
  {
    items: storeNavigation,
    header: 'Store Management',
  },
  {
    items: marketingNavigation,
    header: 'Marketing & Growth',
  },
  {
    items: analyticsNavigation,
    header: 'Analytics & Reports',
  },
];

export interface Branch {
  id: string;
  name: string;
  location: string;
  isAdmin: boolean;
}

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'all',
    name: 'All Branches',
    location: 'Overview',
    isAdmin: true,
  },
  {
    id: 'branch-1',
    name: 'Main Branch',
    location: 'Downtown',
    isAdmin: false,
  },
  {
    id: 'branch-2',
    name: 'North Branch',
    location: 'Uptown',
    isAdmin: false,
  },
  {
    id: 'branch-3',
    name: 'West Branch',
    location: 'Westside Mall',
    isAdmin: false,
  },
];

export const notificationActions: QuickAction[] = [
  {
    icon: MessageSquare,
    href: '/business/messages',
    badge: 5,
    badgeVariant: 'destructive',
    label: 'Messages',
  },
  {
    icon: Bell,
    href: '/business/notifications',
    badge: 3,
    badgeVariant: 'default',
    label: 'Notifications',
  },
];
