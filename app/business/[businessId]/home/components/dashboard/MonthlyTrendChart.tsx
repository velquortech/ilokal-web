'use client';

import { LineChart, Line, XAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/components/custom/ChartCard';
import type { MonthlyTrendPoint } from '@/lib/types';

interface MonthlyTrendChartProps {
  trend: MonthlyTrendPoint[];
}

const chartConfig: ChartConfig = {
  followers: {
    label: 'New Followers',
    color: 'var(--chart-1)',
  },
  redemptions: {
    label: 'Redemptions',
    color: 'var(--chart-2)',
  },
};

export function MonthlyTrendChart({ trend }: MonthlyTrendChartProps) {
  return (
    <ChartCard
      title="6-Month Trend"
      description="New followers vs coupon redemptions"
      className="lg:col-span-2"
    >
      {trend.length === 0 ? (
        <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
          No data yet
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <LineChart data={trend}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="followers"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="redemptions"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}
