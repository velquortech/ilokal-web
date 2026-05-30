import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { FollowerFunnelData } from '@/lib/types';

interface FollowerFunnelCardProps {
  funnel: FollowerFunnelData;
}

const FUNNEL_STEPS: Array<{
  key: keyof FollowerFunnelData;
  label: string;
}> = [
  { key: 'total_followers', label: 'Total Followers' },
  { key: 'ever_redeemed', label: 'Ever Redeemed' },
  { key: 'active_30d', label: 'Active (30d)' },
  { key: 'loyal', label: 'Loyal (2+ months)' },
];

export function FollowerFunnelCard({ funnel }: FollowerFunnelCardProps) {
  const total = funnel.total_followers || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Follower Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        {funnel.total_followers === 0 ? (
          <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
            No followers yet
          </div>
        ) : (
          <div className="space-y-4">
            {FUNNEL_STEPS.map(({ key, label }) => {
              const count = funnel[key];
              const pct = Math.min(100, Math.round((count / total) * 100));

              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
