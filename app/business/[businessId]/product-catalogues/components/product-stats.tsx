'use client';

import { StatCard } from '@/components/custom/StatCard';
import { CircleCheck, FlagOff, Hash, PhilippinePeso } from 'lucide-react';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import type { ProductStats } from '@/lib/types';

interface Props {
  stats: ProductStats;
}

export function ProductStats({ stats }: Props) {
  const vocabulary = useOfferingVocabulary();
  const items = [
    { title: vocabulary.totalLabel, icon: Hash, value: stats.total },
    { title: 'On Sale', icon: PhilippinePeso, value: stats.on_sale },
    { title: 'Active', icon: CircleCheck, value: stats.active },
    { title: 'Unlisted', icon: FlagOff, value: stats.unlisted },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, idx) => (
        <StatCard {...item} key={idx} />
      ))}
    </div>
  );
}
