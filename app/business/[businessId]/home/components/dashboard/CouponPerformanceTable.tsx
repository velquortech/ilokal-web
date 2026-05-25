import { ChartCard } from '@/components/custom/ChartCard';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CouponPerformanceItem } from '@/lib/types';

interface CouponPerformanceTableProps {
  coupons: CouponPerformanceItem[];
}

export function CouponPerformanceTable({
  coupons,
}: CouponPerformanceTableProps) {
  return (
    <ChartCard
      title="Coupon & Deal Performance"
      description="Sorted by redemptions"
    >
      {coupons.length === 0 ? (
        <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
          No coupons published yet
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Max</TableHead>
              <TableHead className="text-right">Redeemed</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Avg Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.coupon_id}>
                <TableCell className="font-mono font-medium">
                  {coupon.code}
                  {coupon.description && (
                    <p className="text-muted-foreground max-w-48 truncate text-xs font-normal">
                      {coupon.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {coupon.promotion_type === 'deal' ? (
                    <Badge
                      variant="outline"
                      className="border-green-600 text-green-700"
                    >
                      Deal
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-blue-600 text-blue-700"
                    >
                      Coupon
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {coupon.max_redemptions ?? '∞'}
                </TableCell>
                <TableCell className="text-right">{coupon.redeemed}</TableCell>
                <TableCell className="text-right">
                  {coupon.rate !== null ? `${coupon.rate}%` : 'Unlimited'}
                </TableCell>
                <TableCell className="text-right">
                  {coupon.avg_days_to_redeem !== null
                    ? `${coupon.avg_days_to_redeem}d`
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </ChartCard>
  );
}
