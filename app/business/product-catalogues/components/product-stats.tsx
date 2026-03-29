import { StatCard } from '@/components/custom/StatCard';
import { CircleCheck, FlagOff, Hash, PhilippinePeso } from 'lucide-react';

const stats = [
  {
    title: 'Total Products',
    icon: Hash,
    value: 99,
  },
  {
    title: 'On Sale',
    icon: PhilippinePeso,
    value: 99,
  },
  {
    title: 'Active',
    icon: CircleCheck,
    value: 99,
  },
  {
    title: 'Unlisted',
    icon: FlagOff,
    value: 99,
  },
];

export function ProductStats() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((item, idx) => (
        <StatCard {...item} key={idx} />
      ))}
    </div>
  );
}
