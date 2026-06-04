import { StatCard } from '@/components/custom/StatCard';
import { Hash, Users, CheckCircle2, BadgeCheck } from 'lucide-react';
import type { RedemptionSummaryStats } from '@/lib/types';

interface RedemptionStatsProps {
  stats: RedemptionSummaryStats;
}

export function RedemptionStats({ stats }: RedemptionStatsProps) {
  const items = [
    { title: 'Total Redemptions', icon: Hash, value: stats.total },
    { title: 'Unique Users', icon: Users, value: stats.unique_users },
    { title: 'Active', icon: CheckCircle2, value: stats.active },
    { title: 'Claimed', icon: BadgeCheck, value: stats.claimed },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((item) => (
        <StatCard {...item} key={item.title} />
      ))}
    </div>
  );
}
