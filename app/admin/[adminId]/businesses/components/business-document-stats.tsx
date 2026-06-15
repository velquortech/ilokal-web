import { StatCard } from '@/components/custom/StatCard';
import { Building2, Clock, CircleCheck, CircleX } from 'lucide-react';

interface Props {
  counts: Record<string, number>;
}

/**
 * Status overview for the admin business-document review page. Mirrors the
 * business-side StatCard grids (e.g. ProductStats) for design parity.
 */
export function BusinessDocumentStats({ counts }: Props) {
  const items = [
    { title: 'Total Businesses', icon: Building2, value: counts.total ?? 0 },
    { title: 'Pending', icon: Clock, value: counts.pending ?? 0 },
    { title: 'Verified', icon: CircleCheck, value: counts.verified ?? 0 },
    { title: 'Rejected', icon: CircleX, value: counts.rejected ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((item, idx) => (
        <StatCard {...item} key={idx} />
      ))}
    </div>
  );
}
