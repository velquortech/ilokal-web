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
      {/*
        `flex-1 min-h-0` so a chart can opt into filling the card with
        `h-full`. Cards in a grid row stretch to the tallest sibling, and a
        fixed-height chart left that extra space empty. Charts that keep a
        fixed height are unaffected — the content box just grows around them.
      */}
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {children}
      </CardContent>
    </Card>
  );
}
