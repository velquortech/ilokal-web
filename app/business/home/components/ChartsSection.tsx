'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { ChartCard } from '@/components/custom/ChartCard';
import { SALES_DATA, CATEGORY_DATA, WEEKLY_DATA } from '../lib/data';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
  sales: {
    label: 'Revenue',
    color: 'var(--chart-1)',
  },
  orders: {
    label: 'Orders',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export function RevenueOverview() {
  return (
    <ChartCard
      title="Revenue Overview"
      description="Monthly revenue and order trends"
      className="lg:col-span-2"
    >
      <ChartContainer config={chartConfig} className="min-h-50 w-full">
        <AreaChart data={SALES_DATA}>
          <CartesianGrid />
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
            tickFormatter={(value) => `₱${value / 1000}k`}
          />
          <ChartTooltip
            content={<ChartTooltipContent className="min-w-36" />}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            dataKey="sales"
            fill="var(--color-sales)" // Automatically mapped by ChartContainer
            stroke="var(--color-sales)"
          />
          <Area
            dataKey="orders"
            fill="var(--color-orders)"
            stroke="var(--color-orders)"
          />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  );
}

const chartConfigPie = {
  Electronics: {
    label: 'Electronics',
    color: 'var(--chart-1)',
  },
  Clothing: {
    label: 'Clothing',
    color: 'var(--chart-2)',
  },
  'Home & Garden': {
    label: 'Home & Garden',
    color: 'var(--chart-3)',
  },
  Sports: {
    label: 'Sports',
    color: 'var(--chart-4)',
  },
  Others: {
    label: 'Others',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig;

export function CategoryDistribution() {
  return (
    <ChartCard title="Sales by Category" description="Revenue distribution">
      <ChartContainer config={chartConfigPie} className="min-h-96 w-full">
        <PieChart>
          <Pie
            data={CATEGORY_DATA}
            innerRadius={80}
            dataKey="value"
            nameKey="name"
          />
          <ChartTooltip
            content={<ChartTooltipContent className="min-w-40" />}
          />
        </PieChart>
      </ChartContainer>

      <div className="mt-4 space-y-2">
        {CATEGORY_DATA.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    chartConfigPie[item.name as keyof typeof chartConfigPie]
                      ?.color,
                }}
              />
              <span className="text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-medium">{item.value}%</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

const chartConfigBar = {
  revenue: {
    label: 'Revenue',
    color: 'var(--chart-1)',
  },
  visitors: {
    label: 'Visitors',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export function WeeklyPerformance() {
  return (
    <ChartCard
      title="Weekly Performance"
      description="Revenue vs Visitor traffic"
    >
      <ChartContainer config={chartConfigBar} className="min-h-96 w-full">
        <BarChart data={WEEKLY_DATA}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₱${value / 1000}k`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="revenue"
            radius={[4, 4, 0, 0]}
            name="Revenue"
            fill="var(--color-revenue)"
          />
          <Bar
            dataKey="visitors"
            radius={[4, 4, 0, 0]}
            name="Visitors"
            fill="var(--color-visitors)"
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
