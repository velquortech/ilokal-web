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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartCard } from '@/components/custom/ChartCard';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Users, Building2, FileText, TrendingUp } from 'lucide-react';

const dashboardData = [
  { month: 'Jan', users: 400, businesses: 240 },
  { month: 'Feb', users: 520, businesses: 290 },
  { month: 'Mar', users: 680, businesses: 350 },
  { month: 'Apr', users: 750, businesses: 420 },
  { month: 'May', users: 890, businesses: 510 },
  { month: 'Jun', users: 1050, businesses: 620 },
];

const chartConfig = {
  users: {
    label: 'Users',
    color: 'var(--chart-1)',
  },
  businesses: {
    label: 'Businesses',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back to iLokal Admin Panel
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,050</div>
            <p className="text-muted-foreground text-xs">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Businesses</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">620</div>
            <p className="text-muted-foreground text-xs">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Documents
            </CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-muted-foreground text-xs">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+18%</div>
            <p className="text-muted-foreground text-xs">Year over year</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="User & Business Growth"
          description="New users vs businesses per month"
        >
          <ChartContainer config={chartConfig} className="min-h-75 w-full">
            <BarChart data={dashboardData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
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
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Trend Analysis" description="Cumulative growth trend">
          <ChartContainer config={chartConfig} className="min-h-75 w-full">
            <AreaChart data={dashboardData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
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
          </ChartContainer>
        </ChartCard>
      </div>
    </div>
  );
}
