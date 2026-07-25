'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BadgePercent, Heart, Loader2, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuthNudgeDialog } from '@/components/customer/AuthNudgeDialog';
import { redeemCouponAction } from '@/app/customer/actions/customerActions';
import { ROUTES } from '@/config/routeConfig';
import type { PublicBranch, PublicCoupon } from '@/lib/types';

function formatDiscount(discount: PublicCoupon['discount']): string {
  if (!discount) return 'Deal';
  return discount.type === 'percentage'
    ? `${discount.value}% off`
    : `₱${discount.value} off`;
}

function formatEnds(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
}

interface CouponCardProps {
  coupon: PublicCoupon;
  branches: PublicBranch[];
  /** null = anonymous visitor; false = signed in, not a customer. */
  isCustomer: boolean | null;
}

export function CouponCard({ coupon, branches, isCustomer }: CouponCardProps) {
  const router = useRouter();
  // Owners/admins browse read-only — same treatment as FollowButton: no
  // permanently-disabled button that reads as broken.
  const showRedeem = isCustomer !== false;
  const [nudgeOpen, setNudgeOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [redeemedCode, setRedeemedCode] = React.useState<string | null>(null);

  // Coupon scoped to one branch → that branch; else default to the first.
  const branchOptions = coupon.branch_id
    ? branches.filter((b) => b.id === coupon.branch_id)
    : branches;
  const [branchId, setBranchId] = React.useState(branchOptions[0]?.id ?? '');

  const remaining =
    coupon.max_redemptions_global !== null
      ? Math.max(0, coupon.max_redemptions_global - coupon.current_redemptions)
      : null;

  const redeem = () => {
    if (isCustomer === null) {
      setNudgeOpen(true);
      return;
    }
    if (!branchId) {
      toast.error('This shop has no branch to redeem at yet', {
        id: `redeem-${coupon.id}`,
      });
      return;
    }
    startTransition(async () => {
      const result = await redeemCouponAction(coupon.id, branchId);
      if (result.ok) {
        setRedeemedCode(result.redemption.code ?? null);
        router.refresh();
      } else {
        toast.error(result.message, { id: `redeem-${coupon.id}` });
      }
    });
  };

  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold">
          <BadgePercent className="h-4 w-4" />
          {formatDiscount(coupon.discount)}
        </div>
        <Badge
          variant={coupon.promotion_type === 'deal' ? 'default' : 'secondary'}
        >
          {coupon.promotion_type === 'deal' ? 'Deal' : 'Coupon'}
        </Badge>
      </div>

      {coupon.description && (
        <p className="text-sm leading-snug">{coupon.description}</p>
      )}

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>Ends {formatEnds(coupon.expiry_date)}</span>
        {remaining !== null && <span>{remaining} left</span>}
        {coupon.requires_follow && (
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3 w-3" />
            Followers only
          </span>
        )}
      </div>

      {showRedeem && (
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {!coupon.branch_id && branchOptions.length > 1 && (
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-9 w-40" aria-label="Redeem at branch">
                <SelectValue placeholder="Pick a branch" />
              </SelectTrigger>
              <SelectContent>
                {branchOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            onClick={redeem}
            disabled={isPending || remaining === 0}
            className="flex-1"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redeeming…
              </>
            ) : remaining === 0 ? (
              'Fully redeemed'
            ) : (
              <>
                <Ticket className="h-4 w-4" />
                Redeem
              </>
            )}
          </Button>
        </div>
      )}

      <AuthNudgeDialog
        open={nudgeOpen}
        onOpenChange={setNudgeOpen}
        intent="redeem this deal"
      />

      <Dialog
        open={redeemedCode !== null}
        onOpenChange={(open) => !open && setRedeemedCode(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              Deal added to your wallet 🎉
            </DialogTitle>
            <DialogDescription className="text-center">
              Show this code at the counter before it expires.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-lg py-4 text-center font-mono text-3xl font-bold tracking-[0.3em]">
            {redeemedCode ?? '——————'}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button asChild className="w-full">
              <Link href={ROUTES.CUSTOMER.WALLET}>Open my wallet</Link>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setRedeemedCode(null)}
            >
              Keep browsing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
