import { DollarSign, ShoppingCart, Users, Target } from 'lucide-react';
import type {
  SalesData,
  CategoryData,
  WeeklyData,
  Order,
  TopProduct,
  TourFeature,
} from './types';

export const SALES_DATA: SalesData[] = [
  { month: 'Jan', sales: 12500, orders: 1045, customers: 89 },
  { month: 'Feb', sales: 18200, orders: 4298, customers: 124 },
  { month: 'Mar', sales: 24500, orders: 12567, customers: 156 },
  { month: 'Apr', sales: 22100, orders: 8834, customers: 142 },
  { month: 'May', sales: 31200, orders: 14045, customers: 198 },
  { month: 'Jun', sales: 38700, orders: 20412, customers: 245 },
];

export const CATEGORY_DATA: CategoryData[] = [
  // The 'fill' value must match your chartConfig keys
  { name: 'Electronics', value: 400, fill: 'var(--color-Electronics)' },
  { name: 'Clothing', value: 300, fill: 'var(--color-Clothing)' },
  // NOTE: Keys with spaces like 'Home & Garden' can be problematic
  { name: 'Home & Garden', value: 300, fill: 'var(--color-homeGarden)' },
  { name: 'Sports', value: 200, fill: 'var(--color-Sports)' },
  { name: 'Others', value: 100, fill: 'var(--color-Others)' },
];

export const WEEKLY_DATA: WeeklyData[] = [
  { day: 'Mon', revenue: 4200, visitors: 320 },
  { day: 'Tue', revenue: 5100, visitors: 385 },
  { day: 'Wed', revenue: 4800, visitors: 342 },
  { day: 'Thu', revenue: 6200, visitors: 468 },
  { day: 'Fri', revenue: 7500, visitors: 542 },
  { day: 'Sat', revenue: 8900, visitors: 678 },
  { day: 'Sun', revenue: 7200, visitors: 521 },
];

export const RECENT_ORDERS: Order[] = [
  {
    id: '#ORD-7842',
    customer: 'Maria Santos',
    amount: 2840,
    status: 'completed',
    time: '2 hours ago',
  },
  {
    id: '#ORD-7841',
    customer: 'John Cruz',
    amount: 1520,
    status: 'processing',
    time: '3 hours ago',
  },
  {
    id: '#ORD-7840',
    customer: 'Ana Reyes',
    amount: 3950,
    status: 'completed',
    time: '5 hours ago',
  },
  {
    id: '#ORD-7839',
    customer: 'Carlos Lim',
    amount: 890,
    status: 'pending',
    time: '6 hours ago',
  },
  {
    id: '#ORD-7838',
    customer: 'Lisa Tan',
    amount: 2100,
    status: 'completed',
    time: '8 hours ago',
  },
  {
    id: '#ORD-78786',
    customer: 'Lisa Tan',
    amount: 2100,
    status: 'completed',
    time: '8 hours ago',
  },
  {
    id: '#ORD-788767',
    customer: 'Lisa Tan',
    amount: 2100,
    status: 'completed',
    time: '8 hours ago',
  },
];

export const TOP_PRODUCTS: TopProduct[] = [
  { name: 'Wireless Earbuds Pro', sales: 142, revenue: 426000, trend: 12 },
  { name: 'Smart Watch Series 5', sales: 98, revenue: 392000, trend: 8 },
  { name: 'Portable Blender', sales: 87, revenue: 174000, trend: -3 },
  { name: 'Yoga Mat Premium', sales: 76, revenue: 114000, trend: 15 },
  { name: 'Ceramic Coffee Set', sales: 64, revenue: 128000, trend: 5 },
];

export const TOUR_FEATURES: TourFeature[] = [
  { icon: 'check', text: 'Complete business profile setup in 5 minutes' },
  { icon: 'check', text: 'Upload products and start selling immediately' },
  { icon: 'check', text: 'Get verified badge to build customer trust' },
  { icon: 'check', text: 'Access analytics and insights dashboard' },
];

export const calculateDashboardMetrics = (salesData: SalesData[]) => {
  const totalSales = salesData.reduce((acc, curr) => acc + curr.sales, 0);
  const totalOrders = salesData.reduce((acc, curr) => acc + curr.orders, 0);
  const totalCustomers = salesData[salesData.length - 1].customers;
  const avgOrderValue = Math.round((totalSales / totalOrders) * 100) / 100;

  return { totalSales, totalOrders, totalCustomers, avgOrderValue };
};

export const getStatMetrics = (
  metrics: ReturnType<typeof calculateDashboardMetrics>,
) => [
  {
    title: 'Total Revenue',
    value: `₱${metrics.totalSales.toLocaleString()}`,
    description: 'Last 6 months',
    icon: DollarSign,
    iconClassName: 'text-emerald-600',
    trend: { value: '+23.5% from last month', positive: true },
  },
  {
    title: 'Total Orders',
    value: metrics.totalOrders.toLocaleString(),
    description: 'Across all branches',
    icon: ShoppingCart,
    iconClassName: 'text-blue-600',
    trend: { value: '+12.3% this month', positive: true },
  },
  {
    title: 'Active Customers',
    value: metrics.totalCustomers.toLocaleString(),
    description: 'Unique buyers',
    icon: Users,
    iconClassName: 'text-purple-600',
    trend: { value: '+8.1% this month', positive: true },
  },
  {
    title: 'Avg. Order Value',
    value: `₱${metrics.avgOrderValue.toLocaleString()}`,
    description: 'Per transaction',
    icon: Target,
    iconClassName: 'text-amber-600',
    trend: { value: '+5.2% this month', positive: true },
  },
];
