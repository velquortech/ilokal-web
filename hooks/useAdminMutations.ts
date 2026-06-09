'use client';

import { useTransition, useCallback } from 'react';
import { UserFormData } from '@/app/admin/[adminId]/schemas/userFormSchema';
import type { AdminUpdateUserInput } from '@/services';
import { AdminUser } from '@/lib/types/admin';
import {
  createAdminAction,
  updateAdminAction,
  deleteAdminAction,
  updateAdminStatusAction,
  createConsumerAction,
  updateConsumerAction,
  deleteConsumerAction,
  createBusinessOwnerAction,
  updateBusinessOwnerAction,
  deleteBusinessOwnerAction,
} from '@/app/admin/[adminId]/actions';

/**
 * Create mutations hook with typed action function
 */
export function useCreateAdmin(
  onSuccess?: (profile: AdminUser) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (data: UserFormData) => {
      startTransition(async () => {
        const result = await createAdminAction({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone_number: data.phone_number,
          avatar_url: data.avatar_url,
          role: 'admin',
        });

        if (result.success && result.data) {
          onSuccess?.(result.data);
        } else {
          onError?.(result.error || 'Failed to create admin');
        }
      });
    },
    [onSuccess, onError],
  );

  return { mutate, isPending };
}

/**
 * Update mutations hook with typed action function
 */
export function useUpdateAdmin(
  onSuccess?: (profile: AdminUser) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (id: string, changes: AdminUpdateUserInput) => {
      startTransition(async () => {
        const result = await updateAdminAction(id, changes);

        if (result.success && result.data) {
          onSuccess?.(result.data);
        } else {
          onError?.(result.error || 'Failed to update admin');
        }
      });
    },
    [onSuccess, onError],
  );

  return { mutate, isPending };
}

/**
 * Delete mutations hook
 */
export function useDeleteAdmin(
  onSuccess?: (id: string) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await deleteAdminAction(id);

        if (result.success) {
          onSuccess?.(id);
        } else {
          onError?.(result.error || 'Failed to delete admin');
        }
      });
    },
    [onSuccess, onError],
  );

  return { mutate, isPending };
}

/**
 * Status update hook
 */
export function useUpdateAdminStatus(
  onSuccess?: (data: AdminUser) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (id: string, status: 'active' | 'inactive' | 'suspended') => {
      startTransition(async () => {
        const result = await updateAdminStatusAction(id, status);

        if (result.success && result.data) {
          onSuccess?.(result.data);
        } else {
          onError?.(result.error || 'Failed to update admin status');
        }
      });
    },
    [onSuccess, onError],
  );

  return { mutate, isPending };
}

// ============================================================================
// CONSUMER MUTATIONS
// ============================================================================

export function useCreateConsumer(
  onSuccess?: (profile: AdminUser) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (data: UserFormData) => {
      startTransition(async () => {
        const result = await createConsumerAction({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone_number: data.phone_number,
          avatar_url: data.avatar_url,
          role: 'app_user',
        });

        if (result.success && result.data) {
          console.info(
            '[useCreateConsumer] Calling onSuccess with:',
            result.data,
          );
          onSuccess?.(result.data);
        } else {
          onError?.(result.error || 'Failed to create consumer');
        }
      });
    },
    [onSuccess, onError],
  );

  return { mutate, isPending };
}

export function useUpdateConsumer(
  onSuccess?: (profile: AdminUser) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (id: string, changes: AdminUpdateUserInput) => {
      startTransition(async () => {
        const result = await updateConsumerAction(id, changes);

        if (result.success && result.data) {
          onSuccess?.(result.data);
        } else {
          onError?.(result.error || 'Failed to update consumer');
        }
      });
    },
    [onSuccess, onError],
  );

  return { mutate, isPending };
}

export function useDeleteConsumer(
  onSuccess?: (id: string) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await deleteConsumerAction(id);

        if (result.success) {
          onSuccess?.(id);
        } else {
          onError?.(result.error || 'Failed to delete consumer');
        }
      });
    },
    [onSuccess, onError],
  );

  return { mutate, isPending };
}

// ============================================================================
// BUSINESS OWNER MUTATIONS
// ============================================================================

export function useCreateBusinessOwner(
  onSuccess?: (profile: AdminUser) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (data: UserFormData) => {
      startTransition(async () => {
        const result = await createBusinessOwnerAction({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone_number: data.phone_number,
          avatar_url: data.avatar_url,
          role: 'business_owner',
        });

        if (result.success && result.data) {
          console.info(
            '[useCreateBusinessOwner] Calling onSuccess with:',
            result.data,
          );
          onSuccess?.(result.data);
        } else {
          onError?.(result.error || 'Failed to create business owner');
        }
      });
    },
    [onSuccess, onError],
  );

  return { mutate, isPending };
}

export function useUpdateBusinessOwner(
  onSuccess?: (profile: AdminUser) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (id: string, changes: AdminUpdateUserInput) => {
      startTransition(async () => {
        const result = await updateBusinessOwnerAction(id, changes);

        if (result.success && result.data) {
          onSuccess?.(result.data);
        } else {
          onError?.(result.error || 'Failed to update business owner');
        }
      });
    },
    [onSuccess, onError],
  );

  return { mutate, isPending };
}

export function useDeleteBusinessOwner(
  onSuccess?: (id: string) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await deleteBusinessOwnerAction(id);

        if (result.success) {
          onSuccess?.(id);
        } else {
          onError?.(result.error || 'Failed to delete business owner');
        }
      });
    },
    [onSuccess, onError],
  );

  return { mutate, isPending };
}
