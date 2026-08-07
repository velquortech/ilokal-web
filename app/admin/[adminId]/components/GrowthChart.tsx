'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { ChartCard } from '@/components/custom/ChartCard';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { GrowthBucket } from '@/lib/types';

/**
 * The two growth charts.
 *
 * A client component only because recharts needs the DOM — it takes its data
 * as props and fetches nothing. The page above it is a server component, which
 * is what stopped these charts being drawn from a hardcoded const.
 */

const chartConfig = {
  users: { label: 'Users', color: 'var(--chart-1)' },
  businesses: { label: 'Businesses', color: 'var(--chart-2)' },
} satisfies ChartConfig;

interface GrowthChartsProps {
  buckets: GrowthBucket[];
  /**
   * A read failed. Say so instead of drawing a flat line at zero — on an admin
   * dashboard "no signups" and "the query broke" look identical, and one of
   * them gets acted on.
   */
  failed?: boolean;
}

/**
 * The same numbers as a table, for anyone not reading the SVG.
 *
 * recharts renders a chart as unlabelled paths, so `accessibilityLayer` alone
 * gives keyboard traversal but still nothing to read. This is the actual text
 * alternative; it is `sr-only` rather than hidden so it is reachable.
 */
function ChartDataTable({
  caption,
  buckets,
}: {
  caption: string;
  buckets: GrowthBucket[];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Month</th>
          <th scope="col">New users</th>
          <th scope="col">New businesses</th>
        </tr>
      </thead>
      <tbody>
        {buckets.map((bucket) => (
          <tr key={bucket.month}>
            <th scope="row">{bucket.month}</th>
            <td>{bucket.users}</td>
            <td>{bucket.businesses}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartUnavailable({ reason }: { reason: string }) {
  return (
    <div className="text-muted-foreground flex min-h-75 items-center justify-center text-center text-sm">
      {reason}
    </div>
  );
}

export function GrowthCharts({ buckets, failed = false }: GrowthChartsProps) {
  const hasAnyActivity = buckets.some(
    (bucket) => bucket.users > 0 || bucket.businesses > 0,
  );

  const body = (children: React.ReactNode) => {
    if (failed) {
      return (
        <ChartUnavailable reason="We couldn’t load this chart. Try again shortly." />
      );
    }
    if (!hasAnyActivity) {
      return <ChartUnavailable reason="No signups yet in this period." />;
    }
    return children;
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard
        title="User & Business Growth"
        description="New users vs businesses per month"
      >
        {body(
          <ChartContainer config={chartConfig} className="min-h-75 w-full">
            <BarChart data={buckets} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              {/* Counts are integers — the default tick formatter will happily
                  render 0.5 of a signup on a small dataset. */}
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="users"
                radius={[4, 4, 0, 0]}
                fill="var(--color-users)"
              />
              <Bar
                dataKey="businesses"
                radius={[4, 4, 0, 0]}
                fill="var(--color-businesses)"
              />
            </BarChart>
          </ChartContainer>,
        )}
        {!failed && hasAnyActivity && (
          <ChartDataTable
            caption="New users and businesses per month"
            buckets={buckets}
          />
        )}
      </ChartCard>

      <ChartCard
        title="Trend Analysis"
        description="New users and businesses over time"
      >
        {body(
          <ChartContainer config={chartConfig} className="min-h-75 w-full">
            <AreaChart data={buckets} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="users"
                fill="var(--color-users)"
                stroke="var(--color-users)"
              />
              <Area
                dataKey="businesses"
                fill="var(--color-businesses)"
                stroke="var(--color-businesses)"
              />
            </AreaChart>
          </ChartContainer>,
        )}
        {!failed && hasAnyActivity && (
          <ChartDataTable
            caption="Cumulative view of new users and businesses per month"
            buckets={buckets}
          />
        )}
      </ChartCard>
    </div>
  );
}
