import type { Coupon, ProductResponse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Ellipsis } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UpdateCouponDialog } from '../update-coupon';
import { DeleteCouponDialog } from '../delete-coupon';

interface CouponActionsProps {
  coupon: Coupon;
  products: ProductResponse[];
}

export function CouponActions({ coupon, products }: CouponActionsProps) {
  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <UpdateCouponDialog coupon={coupon} products={products}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          </UpdateCouponDialog>
          <DropdownMenuSeparator />
          <DeleteCouponDialog coupon={coupon}>
            <DropdownMenuItem
              className="text-destructive"
              onSelect={(e) => e.preventDefault()}
            >
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DeleteCouponDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
