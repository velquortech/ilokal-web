import { StatCard } from '@/components/custom/StatCard';
import { CircleCheck, FlagOff, Hash, PackageX } from 'lucide-react';

interface ProductStatsProps {
  stats: { total: number; active: number; inactive: number; archived: number };
}

export function ProductStats({ stats }: ProductStatsProps) {
  const items = [
    { title: 'Total Products', icon: Hash, value: stats.total },
    { title: 'Active', icon: CircleCheck, value: stats.active },
    { title: 'Inactive', icon: FlagOff, value: stats.inactive },
    { title: 'Archived', icon: PackageX, value: stats.archived },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <StatCard {...item} key={idx} />
      ))}
    </div>
  );
}
