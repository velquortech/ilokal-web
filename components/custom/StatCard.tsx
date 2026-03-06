/**
 * Reusable stat card component for dashboards
 * Displays a metric with an icon and trend indicator
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

/**
 * Stat card component for displaying dashboard metrics
 */
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-primary h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend ? (
          <p
            className={cn(
              'text-xs',
              trend.positive ? 'text-green-600' : 'text-red-600',
            )}
          >
            {trend.value}
          </p>
        ) : description ? (
          <p className="text-muted-foreground text-xs">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
