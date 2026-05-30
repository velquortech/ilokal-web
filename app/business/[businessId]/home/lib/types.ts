import type { LucideIcon } from 'lucide-react';

export interface SalesData {
  month: string;
  sales: number;
  orders: number;
  customers: number;
}

export interface CategoryData {
  name: string;
  value: number;
  fill: string;
}

export interface WeeklyData {
  day: string;
  revenue: number;
  visitors: number;
}

export interface Order {
  id: string;
  customer: string;
  amount: number;
  status: 'completed' | 'processing' | 'pending';
  time: string;
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
  trend: number;
}

export interface TourFeature {
  icon: 'check';
  text: string;
}

export interface OnboardingStep {
  label: string;
  completed: boolean;
}

export interface StatMetric {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  trend: {
    value: string;
    positive: boolean;
  };
}
