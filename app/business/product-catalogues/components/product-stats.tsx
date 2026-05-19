import { StatCard } from '@/components/custom/StatCard';
import { CircleCheck, FlagOff, Hash, PackageX } from 'lucide-react';
import type { ProductResponse } from '@/lib/types';

interface ProductStatsProps {
  products: ProductResponse[];
  isLoading: boolean;
}

export function ProductStats({ products, isLoading }: ProductStatsProps) {
  const total = products.length;
  const active = products.filter((p) => p.status === 'active').length;
  const inactive = products.filter((p) => p.status === 'inactive').length;
  const archived = products.filter((p) => p.status === 'archived').length;

  const stats = [
    { title: 'Total Products', icon: Hash, value: isLoading ? '—' : total },
    { title: 'Active', icon: CircleCheck, value: isLoading ? '—' : active },
    { title: 'Inactive', icon: FlagOff, value: isLoading ? '—' : inactive },
    { title: 'Archived', icon: PackageX, value: isLoading ? '—' : archived },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((item, idx) => (
        <StatCard {...item} key={idx} />
      ))}
    </div>
  );
}
