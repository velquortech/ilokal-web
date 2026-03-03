'use client';

import { useTransition } from 'react';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { logoutAction } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle, Clock } from 'lucide-react';

/**
 * SessionWarningDialog Component
 *
 * Displays when user's session is about to expire
 * Offers options to continue session or logout
 */
export function SessionWarningDialog() {
  const { isExpiring, timeRemaining, refreshSession } = useSessionMonitor();
  const [isPending, startTransition] = useTransition();

  const handleContinue = () => {
    refreshSession();
  };

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logoutAction();
      } catch {
        // Logout error - user will see error on next action
      }
    });
  };

  return (
    <Dialog
      open={isExpiring}
      onOpenChange={() => {
        // Prevent closing by clicking outside
        if (isExpiring) return;
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <DialogTitle>Session Expiring Soon</DialogTitle>
          </div>
          <DialogDescription>
            Your session will expire in {timeRemaining} minute
            {timeRemaining !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-yellow-50 p-4">
          <div className="flex items-center gap-3">
            <Clock className="flex h-5 w-5 shrink-0 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900">Time Remaining</p>
              <p className="text-sm text-yellow-700">
                Click "Continue Session" to stay logged in
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button onClick={handleLogout} disabled={isPending} variant="outline">
            Logout
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isPending}
            className="bg-black text-white hover:bg-slate-900"
          >
            {isPending ? 'Processing...' : 'Continue Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
