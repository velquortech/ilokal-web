import {
  Package,
  ArrowRight,
  BarChart2,
  PackageOpen,
  ChartArea,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface EmptyStateProps {
  onAddProduct?: () => void;
  onViewOrders?: () => void;
}

export function EmptyState({ onAddProduct, onViewOrders }: EmptyStateProps) {
  return (
    <div className="bg-muted/30 flex flex-1 flex-col items-center justify-center py-12 text-center">
      <Card className="w-full max-w-5xl border-dashed p-20">
        <CardHeader>
          <div className="mx-auto flex -space-x-4">
            <div className="bg-background -rotate-6 rounded-2xl border p-4 shadow-sm">
              <BarChart2 className="text-primary/40 h-8 w-8" />
            </div>
            <div className="bg-background z-10 scale-110 rounded-2xl border p-4 shadow-lg">
              <PackageOpen className="text-primary h-8 w-8 animate-pulse" />
            </div>
            <div className="bg-background rotate-6 rounded-2xl border p-4 shadow-sm">
              <ChartArea className="text-primary/40 h-8 w-8" />
            </div>
          </div>
          <CardTitle className="mt-4 text-xl">No products yet</CardTitle>
          <CardDescription className="mx-auto max-w-md text-center">
            Your shop dashboard is empty. Add your first product to get started
            and start tracking your sales performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button onClick={onAddProduct}>
              <Package className="mr-2 h-4 w-4" />
              Add First Product
            </Button>
            <Button variant="outline" onClick={onViewOrders}>
              View My Shop
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 grid w-full max-w-5xl gap-4 sm:grid-cols-3">
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                <BarChart2 className="text-primary h-5 w-5" />
              </div>
              <p className="text-sm font-medium">No sales data</p>
              <p className="text-muted-foreground text-xs">
                Sales will appear once you start making transactions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                <Package className="text-primary h-5 w-5" />
              </div>
              <p className="text-sm font-medium">No orders yet</p>
              <p className="text-muted-foreground text-xs">
                Order history will populate here
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                <BarChart2 className="text-primary h-5 w-5" />
              </div>
              <p className="text-sm font-medium">No insights available</p>
              <p className="text-muted-foreground text-xs">
                Analytics will unlock with activity
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
