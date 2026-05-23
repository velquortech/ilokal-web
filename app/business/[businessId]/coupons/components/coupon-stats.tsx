import { StatCard } from '@/components/custom/StatCard';
import { Hash, Globe, FileText } from 'lucide-react';

interface CouponStatsProps {
  stats: { total: number; published: number; draft: number };
}

export function CouponStats({ stats }: CouponStatsProps) {
  const items = [
    { title: 'Total', icon: Hash, value: stats.total },
    { title: 'Published', icon: Globe, value: stats.published },
    { title: 'Draft', icon: FileText, value: stats.draft },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <StatCard {...item} key={item.title} />
      ))}
    </div>
  );
}
