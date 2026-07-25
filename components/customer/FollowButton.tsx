'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthNudgeDialog } from './AuthNudgeDialog';
import {
  followBusinessAction,
  unfollowBusinessAction,
} from '@/app/customer/actions/customerActions';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  businessId: string;
  initialFollowing: boolean;
  /** null = anonymous; false = signed in but not a customer (hidden). */
  isCustomer: boolean | null;
}

export function FollowButton({
  businessId,
  initialFollowing,
  isCustomer,
}: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = React.useState(initialFollowing);
  const [nudgeOpen, setNudgeOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  // Owners/admins browse read-only — following is a customer concept.
  if (isCustomer === false) return null;

  const toggle = () => {
    if (isCustomer === null) {
      setNudgeOpen(true);
      return;
    }
    startTransition(async () => {
      const next = !following;
      const result = next
        ? await followBusinessAction(businessId)
        : await unfollowBusinessAction(businessId);
      if (result.ok) {
        setFollowing(next);
        toast.success(next ? 'Following this shop' : 'Unfollowed', {
          id: 'follow-toggle',
        });
        router.refresh();
      } else {
        toast.error(result.message, { id: 'follow-toggle' });
      }
    });
  };

  return (
    <>
      <Button
        variant={following ? 'default' : 'outline'}
        size="sm"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={following}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className={cn('h-4 w-4', following && 'fill-current')} />
        )}
        {following ? 'Following' : 'Follow'}
      </Button>
      <AuthNudgeDialog
        open={nudgeOpen}
        onOpenChange={setNudgeOpen}
        intent="follow this shop"
      />
    </>
  );
}
