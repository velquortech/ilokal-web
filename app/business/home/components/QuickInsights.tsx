'use client';

import { Package, Target, Store } from 'lucide-react';
import { StatCard } from '@/components/custom/StatCard';

const DATA = [
  {
    title: 'Inventory Status',
    value: '128 Products',
    description: (
      <p className="text-destructive mt-1 text-xs">12 low stock items</p>
    ),
    icon: Package,
  },
  {
    title: 'Conversion Rate',
    value: '3.24%',
    description: <p className="mt-1 text-xs text-green-600">+0.5% this week</p>,
    icon: Target,
  },
  {
    title: 'Active Branches',
    value: '3 Locations',
    description: (
      <p className="mt-1 text-xs text-yellow-600">2 pending approval</p>
    ),
    icon: Store,
  },
];

export function QuickInsights() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {DATA.map((d, idx) => (
        <StatCard {...d} key={idx} />
      ))}
    </div>
  );
}
