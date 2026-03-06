/**
 * Reusable chart card component for dashboards
 * Wraps charts in a consistent card layout
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

/**
 * Chart card component for consistent chart presentation
 */
export function ChartCard({
  title,
  description,
  children,
  className,
  headerAction,
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {headerAction}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
