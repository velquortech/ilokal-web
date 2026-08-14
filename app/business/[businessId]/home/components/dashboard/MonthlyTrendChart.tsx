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
        <div className="text-muted-foreground flex h-full min-h-48 flex-col items-center justify-center gap-1 px-6 text-center text-sm">
          <span className="font-medium">No data yet</span>
          <span className="text-xs">
            Publish a deal and share your shop — trends appear once customers
            start following and redeeming.
          </span>
        </div>
      ) : (
        // Fills the card (which stretches to the taller Customer Segments
        // sibling) instead of leaving a dead band beneath a fixed h-48.
        // `aspect-auto` overrides ChartContainer's default `aspect-video`,
        // which would otherwise derive height from width and re-introduce the
        // mismatch; `min-h-48` keeps the old height as a floor.
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-full min-h-48 w-full"
        >
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
