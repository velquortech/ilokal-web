'use client';

import { StatCard } from '@/components/custom/StatCard';
import type { StatMetric } from '../lib/types';

interface StatsOverviewProps {
  metrics: StatMetric[];
}

export function StatsOverview({ metrics }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          description={metric.description}
          icon={metric.icon}
          iconClassName={metric.iconClassName}
          trend={metric.trend}
        />
      ))}
    </div>
  );
}
