import { StatCard } from '@/components/custom/StatCard';
import { Hash, CircleCheck, Clock, CalendarClock } from 'lucide-react';

interface CouponStatsProps {
  stats: { total: number; active: number; expired: number; upcoming: number };
}

export function CouponStats({ stats }: CouponStatsProps) {
  const items = [
    { title: 'Total Coupons', icon: Hash, value: stats.total },
    { title: 'Active', icon: CircleCheck, value: stats.active },
    { title: 'Expired', icon: Clock, value: stats.expired },
    { title: 'Upcoming', icon: CalendarClock, value: stats.upcoming },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <StatCard {...item} key={idx} />
      ))}
    </div>
  );
}
