/**
 * Reusable stat card component for dashboards
 * Displays a metric with an icon and trend indicator
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: ReactNode;
  /**
   * A one-line plain-language explanation of what the number means, aimed at
   * a shopkeeper rather than an analyst ("How many customers came back in the
   * last month"). Rendered under the trend line, never instead of it.
   */
  caption?: ReactNode;
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
  caption,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('gap-0 py-5', className)}>
      <CardHeader className="relative flex flex-row justify-between space-y-0">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
        <div className="bg-primary/10 absolute top-0 right-4 rounded-md p-2">
          <Icon className="text-primary size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="my-1 text-2xl font-bold">{value}</div>
        {trend ? (
          <p
            className={cn(
              'text-xs',
              trend.positive ? 'text-green-600' : 'text-red-600',
            )}
          >
            {trend.value}
          </p>
        ) : (
          (description ?? null)
        )}
        {caption && (
          <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
            {caption}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
