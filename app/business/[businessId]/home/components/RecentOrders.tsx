'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RECENT_ORDERS } from '../lib/data';
import type { Order } from '../lib/types';
import { ChartCard } from '@/components/custom/ChartCard';

interface RecentOrdersProps {
  onViewAll: () => void;
}

const getBadgeVariant = (status: Order['status']) => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'processing':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('');

export function RecentOrders({ onViewAll }: RecentOrdersProps) {
  return (
    <ChartCard
      title="Recent Orders"
      description="Latest transactions from your shop"
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
      <div className="space-y-4">
        {RECENT_ORDERS.map((order) => (
          <div key={order.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(order.customer)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{order.customer}</p>
                <p className="text-muted-foreground text-xs">
                  {order.id} • {order.time}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                ₱{order.amount.toLocaleString()}
              </p>
              <Badge
                variant={getBadgeVariant(order.status)}
                className="text-xs"
              >
                {order.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
