import { StatCard } from '@/components/custom/StatCard';
import { CircleCheck, FlagOff, Hash, PhilippinePeso } from 'lucide-react';
import type { ProductStats } from '@/lib/types';

interface Props {
  stats: ProductStats;
}

export function ProductStats({ stats }: Props) {
  const items = [
    { title: 'Total Products', icon: Hash, value: stats.total },
    { title: 'On Sale', icon: PhilippinePeso, value: stats.on_sale },
    { title: 'Active', icon: CircleCheck, value: stats.active },
    { title: 'Unlisted', icon: FlagOff, value: stats.unlisted },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <StatCard {...item} key={idx} />
      ))}
    </div>
  );
}
