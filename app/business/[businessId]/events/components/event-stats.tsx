'use client';

import { StatCard } from '@/components/custom/StatCard';
import { CalendarDays, CircleCheck, Clock, FileText } from 'lucide-react';
import type { EventStats as EventStatsType } from '@/lib/types';

interface EventStatsProps {
  stats: EventStatsType;
}

/**
 * The owner's four numbers.
 *
 * `failed` renders an em dash rather than a zero: "we couldn't read this" and
 * "you have none" look identical on a stat card otherwise, and a shop with a
 * queue of proposals being told it has none is worse than being told nothing.
 */
export function EventStats({ stats }: EventStatsProps) {
  const value = (n: number) => (stats.failed ? '—' : n);

  const items = [
    { title: 'Total', icon: CalendarDays, value: value(stats.total) },
    { title: 'In review', icon: Clock, value: value(stats.pending_review) },
    { title: 'Published', icon: CircleCheck, value: value(stats.approved) },
    { title: 'Draft', icon: FileText, value: value(stats.draft) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <StatCard
          {...item}
          key={item.title}
          description={
            stats.failed ? (
              <span className="text-muted-foreground text-xs">
                Couldn&apos;t load
              </span>
            ) : undefined
          }
        />
      ))}
    </div>
  );
}
