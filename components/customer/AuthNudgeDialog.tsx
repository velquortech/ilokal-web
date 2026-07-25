'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/custom/BrandLogo';
import { ROUTES } from '@/config/routeConfig';

interface AuthNudgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the visitor was trying to do, e.g. "redeem this deal". */
  intent: string;
}

/**
 * Sign-in nudge for anonymous visitors on customer actions (redeem/follow).
 * Deep-links back to the current page after auth via ?next=.
 */
export function AuthNudgeDialog({
  open,
  onOpenChange,
  intent,
}: AuthNudgeDialogProps) {
  const pathname = usePathname();
  const next = encodeURIComponent(pathname ?? ROUTES.EXPLORE.HOME);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mb-2 flex justify-center">
            <BrandMark size={40} />
          </div>
          <DialogTitle className="text-center">Sign in to {intent}</DialogTitle>
          <DialogDescription className="text-center">
            Create a free customer account to redeem deals, follow shops, and
            keep your coupons in one wallet — same account as the iLokal app.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full">
            <Link href={`${ROUTES.AUTH.SIGNUP}?next=${next}`}>
              Create account
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`${ROUTES.AUTH.LOGIN}?next=${next}`}>
              I already have an account
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
