'use client';

import { ArrowRight, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TOP_PRODUCTS } from '../lib/data';
import { ChartCard } from '@/components/custom/ChartCard';

interface TopProductsProps {
  onViewAll: () => void;
}

export function TopProducts({ onViewAll }: TopProductsProps) {
  return (
    <ChartCard
      title="Top Performing Products"
      description="Best sellers by revenue and units sold"
      headerAction={
        <Button
          variant="outline"
          size="sm"
          className="bg-card"
          onClick={onViewAll}
        >
          View All
          <ArrowRight />
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-sm">
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium">Units Sold</th>
              <th className="pb-3 font-medium">Revenue</th>
              <th className="pb-3 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {TOP_PRODUCTS.map((product) => (
              <tr key={product.name} className="border-b last:border-0">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Package className="text-primary h-5 w-5" />
                    </div>
                    <span className="font-medium">{product.name}</span>
                  </div>
                </td>
                <td className="py-3">{product.sales}</td>
                <td className="py-3">₱{product.revenue.toLocaleString()}</td>
                <td className="py-3">
                  <div
                    className={`flex items-center gap-1 ${
                      product.trend >= 0 ? 'text-green-600' : 'text-destructive'
                    }`}
                  >
                    {product.trend >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>{Math.abs(product.trend)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
