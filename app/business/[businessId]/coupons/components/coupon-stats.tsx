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
    // 2-up on phones with the odd card spanning both columns (no orphan), 3-up
    // on desktop.
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item, idx) => (
        <StatCard
          {...item}
          key={item.title}
          className={
            idx === items.length - 1 ? 'col-span-2 sm:col-span-1' : undefined
          }
        />
      ))}
    </div>
  );
}
