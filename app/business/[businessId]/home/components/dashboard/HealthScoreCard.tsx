import { StatCard } from '@/components/custom/StatCard';
import { Users, TrendingUp, Tag, Star } from 'lucide-react';
import type { BusinessHealthData } from '@/lib/types';

interface HealthScoreCardProps {
  health: BusinessHealthData;
}

function trendLabel(trend: 'up' | 'down' | 'flat'): string {
  if (trend === 'up') return 'Up from last month';
  if (trend === 'down') return 'Down from last month';
  return 'Same as last month';
}

export function HealthScoreCard({ health }: HealthScoreCardProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Retention Rate"
        value={
          health.retention_rate !== null
            ? `${health.retention_rate.toFixed(0)}%`
            : 'No data'
        }
        icon={TrendingUp}
        trend={{
          value: trendLabel(health.retention_trend),
          positive: health.retention_trend === 'up',
        }}
      />
      <StatCard
        title="New Followers This Month"
        value={health.follower_growth}
        icon={Users}
        trend={{
          value: trendLabel(health.follower_growth_trend),
          positive: health.follower_growth_trend === 'up',
        }}
      />
      <StatCard
        title="Active Deals"
        value={health.active_deals}
        icon={Tag}
        description="Published & live"
      />
      <StatCard
        title="Avg Rating"
        value={
          health.avg_rating !== null
            ? `${health.avg_rating.toFixed(1)} ★`
            : 'No ratings'
        }
        icon={Star}
        trend={
          health.avg_rating !== null
            ? {
                value: trendLabel(health.rating_trend),
                positive: health.rating_trend === 'up',
              }
            : undefined
        }
      />
    </div>
  );
}
