'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Coupon } from '@/lib/types';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteCouponAction } from '../../actions/couponActions';

interface DeleteCouponDialogProps {
  coupon: Coupon;
  children: React.ReactNode;
}

export function DeleteCouponDialog({
  coupon,
  children,
}: DeleteCouponDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setServerError(null);
    try {
      const result = await deleteCouponAction(coupon.id);
      if (!result.success) {
        const msg = result.error?.message ?? 'Failed to delete coupon';
        setServerError(msg);
        toast.error(msg);
        return;
      }
      toast.success(`Coupon "${coupon.code}" deleted`);
      setOpen(false);
      router.refresh();
    } catch {
      const msg = 'An unexpected error occurred';
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setServerError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete Coupon
          </DialogTitle>
          <DialogDescription className="py-2">
            Are you sure you want to delete coupon{' '}
            <strong>{coupon.code}</strong>? This action cannot be undone.
            Customers will no longer be able to redeem it.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <p className="text-destructive text-sm">{serverError}</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isDeleting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="min-w-25"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Confirm Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
