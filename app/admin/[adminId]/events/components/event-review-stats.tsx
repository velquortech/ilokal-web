'use client';

import { StatCard } from '@/components/custom/StatCard';
import { CircleCheck, Clock, Sparkles, XCircle } from 'lucide-react';
import type { EventStats } from '@/lib/types';

interface EventReviewStatsProps {
  stats: EventStats;
}

/**
 * The queue's four numbers.
 *
 * "Needs a decision" leads because the queue exists to be emptied. "Staff
 * picks" is the count of platform events — the ones an admin published
 * directly — so the team can see at a glance how much of Explore is their own
 * programming rather than shops'.
 */
export function EventReviewStats({ stats }: EventReviewStatsProps) {
  const value = (n: number) => (stats.failed ? '—' : n);

  const items = [
    {
      title: 'Needs a decision',
      icon: Clock,
      value: value(stats.pending_review),
    },
    { title: 'Published', icon: CircleCheck, value: value(stats.approved) },
    { title: 'Not approved', icon: XCircle, value: value(stats.rejected) },
    { title: 'Staff picks', icon: Sparkles, value: value(stats.staff_picks) },
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
