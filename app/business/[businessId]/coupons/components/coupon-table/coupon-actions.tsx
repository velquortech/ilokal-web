'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, Ellipsis, Copy, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UpdateCouponDialog } from '../update-coupon';
import { AddCouponDialog } from '../add-coupon';
import { DeleteCouponDialog } from '../delete-coupon';
import { updateCouponAction } from '../../../actions/couponActions';
import type { Coupon, CouponStatus, ProductResponse } from '@/lib/types';

interface CouponActionsProps {
  coupon: Coupon;
  products: ProductResponse[];
}

export function CouponActions({ coupon, products }: CouponActionsProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const toggleStatus = async () => {
    if (pending) return;
    setPending(true);
    const next: CouponStatus =
      coupon.status === 'published' ? 'draft' : 'published';
    const toastId = `coupon-status-${coupon.id}`;
    toast.loading(next === 'published' ? 'Publishing…' : 'Unpublishing…', {
      id: toastId,
    });
    try {
      const result = await updateCouponAction(coupon.id, { status: next });
      if (result.success) {
        toast.success(
          next === 'published'
            ? `"${coupon.code}" is now live`
            : `"${coupon.code}" is now a draft`,
          { id: toastId },
        );
        router.refresh();
      } else {
        toast.error(result.error?.message ?? 'Failed to update status', {
          id: toastId,
        });
      }
    } catch {
      toast.error('Failed to update status', { id: toastId });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <Ellipsis className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              void toggleStatus();
            }}
          >
            <Send />
            {coupon.status === 'published' ? 'Unpublish' : 'Publish'}
          </DropdownMenuItem>
          <UpdateCouponDialog coupon={coupon} products={products}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          </UpdateCouponDialog>
          <AddCouponDialog products={products} initial={coupon}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Copy />
              Duplicate
            </DropdownMenuItem>
          </AddCouponDialog>
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
