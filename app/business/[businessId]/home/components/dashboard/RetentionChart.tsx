'use client';

import { BarChart, Bar, XAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/components/custom/ChartCard';
import type { RetentionMonth } from '@/lib/types';

interface RetentionChartProps {
  retention: RetentionMonth[];
}

const chartConfig: ChartConfig = {
  new_customers: {
    label: 'New',
    color: 'var(--chart-1)',
  },
  returning_customers: {
    label: 'Returning',
    color: 'var(--chart-2)',
  },
  churned_customers: {
    label: 'Churned',
    color: 'var(--destructive)',
  },
};

export function RetentionChart({ retention }: RetentionChartProps) {
  const hasData = retention.some(
    (r) =>
      r.new_customers > 0 ||
      r.returning_customers > 0 ||
      r.churned_customers > 0,
  );

  return (
    <ChartCard
      title="Customer Retention"
      description="New, returning, and churned customers per month"
      className="lg:col-span-2"
    >
      {!hasData ? (
        <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
          No retention data yet
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart data={retention}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="new_customers"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="returning_customers"
              fill="var(--chart-2)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="churned_customers"
              fill="var(--destructive)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}
