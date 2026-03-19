'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  restoreUserAction,
  updateAdminStatusAction,
} from '@/app/admin/actions';

interface UseAccountStatusActionsReturn {
  isSubmitting: boolean;
  handleRestore: (userId: string, userName: string) => Promise<void>;
  handleReactivate: (userId: string, userName: string) => Promise<void>;
}

export function useAccountStatusActions(
  onSuccess: () => Promise<void>,
): UseAccountStatusActionsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRestore = useCallback(
    async (userId: string, userName: string) => {
      try {
        setIsSubmitting(true);
        const result = await restoreUserAction(userId);
        if (result.success) {
          toast.success(`${userName} has been restored to active status`);
          await onSuccess();
        } else {
          toast.error(result.error || 'Failed to restore user');
        }
      } catch (error) {
        console.error('Error restoring user:', error);
        toast.error('Error restoring user');
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess],
  );

  const handleReactivate = useCallback(
    async (userId: string, userName: string) => {
      try {
        setIsSubmitting(true);
        const result = await updateAdminStatusAction(userId, 'active');
        if (result.success) {
          toast.success(`${userName} has been reactivated`);
          await onSuccess();
        } else {
          toast.error(result.error || 'Failed to reactivate user');
        }
      } catch (error) {
        console.error('Error reactivating user:', error);
        toast.error('Error reactivating user');
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess],
  );

  return {
    isSubmitting,
    handleRestore,
    handleReactivate,
  };
}
