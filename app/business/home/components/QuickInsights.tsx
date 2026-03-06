'use client';

import { Package, Target, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function QuickInsights() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Inventory Status</p>
              <p className="mt-1 text-2xl font-bold">128 Products</p>
              <p className="text-success mt-1 text-xs">12 low stock items</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-2">
              <Package className="text-primary h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Conversion Rate</p>
              <p className="mt-1 text-2xl font-bold">3.24%</p>
              <p className="text-success mt-1 text-xs">+0.5% this week</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-2">
              <Target className="text-primary h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Active Branches</p>
              <p className="mt-1 text-2xl font-bold">3 Locations</p>
              <p className="text-muted-foreground mt-1 text-xs">
                2 pending approval
              </p>
            </div>
            <div className="bg-primary/10 rounded-lg p-2">
              <Store className="text-primary h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
