'use client';

import { PieChart, Pie, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ChartCard } from '@/components/custom/ChartCard';
import type { CustomerSegmentCounts } from '@/lib/types';

interface CustomerSegmentsChartProps {
  segments: CustomerSegmentCounts;
}

const SEGMENT_CONFIG: Array<{
  key: keyof CustomerSegmentCounts;
  label: string;
  color: string;
}> = [
  { key: 'champion', label: 'Champion', color: 'var(--chart-1)' },
  { key: 'loyal', label: 'Loyal', color: 'var(--chart-2)' },
  { key: 'at_risk', label: 'At Risk', color: 'var(--chart-3)' },
  { key: 'lost', label: 'Lost', color: 'var(--chart-4)' },
  { key: 'new_customer', label: 'New', color: 'var(--chart-5)' },
];

const chartConfig: ChartConfig = Object.fromEntries(
  SEGMENT_CONFIG.map(({ key, label, color }) => [key, { label, color }]),
);

export function CustomerSegmentsChart({
  segments,
}: CustomerSegmentsChartProps) {
  const total = SEGMENT_CONFIG.reduce((sum, { key }) => sum + segments[key], 0);

  const pieData = SEGMENT_CONFIG.map(({ key, label, color }) => ({
    name: label,
    value: segments[key],
    color,
  }));

  return (
    <ChartCard
      title="Customer Segments"
      description="Based on visit recency & frequency"
    >
      {total === 0 ? (
        <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
          No redemption data yet
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <ChartContainer config={chartConfig} className="h-48 w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
                dataKey="value"
              >
                {pieData.map(({ name, color }) => (
                  <Cell key={name} fill={color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="w-full space-y-1 text-sm">
            {SEGMENT_CONFIG.map(({ key, label, color }) => (
              <li key={key} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
                <span className="font-medium">{segments[key]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
