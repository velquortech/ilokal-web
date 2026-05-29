import { GitBranch, MapPin, MapPinOff } from 'lucide-react';
import { StatCard } from '@/components/custom/StatCard';
import type { BranchStats } from '@/lib/types';

interface BranchStatsProps {
  stats: BranchStats;
}

export function BranchStatsCards({ stats }: BranchStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        title="Total Branches"
        value={stats.total}
        icon={GitBranch}
        description={
          <p className="text-muted-foreground text-xs">All active locations</p>
        }
      />
      <StatCard
        title="With Location"
        value={stats.with_location}
        icon={MapPin}
        description={
          <p className="text-muted-foreground text-xs">
            Visible in nearby search
          </p>
        }
      />
      <StatCard
        title="Without Location"
        value={stats.without_location}
        icon={MapPinOff}
        description={
          <p className="text-muted-foreground text-xs">
            Add coordinates to appear on map
          </p>
        }
      />
    </div>
  );
}
