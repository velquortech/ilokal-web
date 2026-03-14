'use client';

import { useTransition } from 'react';
import { UserFormData } from '@/app/admin/schemas/userFormSchema';
import { AdminUpdateUserInput } from '@/services/api/userService';
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
} from '@/app/admin/actions';
import { Profile } from '@/lib/types/user';

// ✅ Use Create Admin Hook
export function useCreateAdmin(
  onSuccess?: () => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = (data: UserFormData) => {
    startTransition(async () => {
      const result = await createAdminAction({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone_number: data.phone_number,
        avatar_url: data.avatar_url,
        role: 'admin',
      });

      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Failed to create admin');
      }
    });
  };

  return {
    mutate,
    isPending,
  };
}

// ✅ Use Update Admin Hook
export function useUpdateAdmin(
  onSuccess?: (profile: Profile) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = (id: string, changes: AdminUpdateUserInput) => {
    startTransition(async () => {
      const result = await updateAdminAction(id, changes);

      if (result.success) {
        onSuccess?.(result.data as Profile);
      } else {
        onError?.(result.error || 'Failed to update admin');
      }
    });
  };

  return {
    mutate,
    isPending,
  };
}

// ✅ Use Delete Admin Hook
export function useDeleteAdmin(
  onSuccess?: (id: string) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = (id: string) => {
    startTransition(async () => {
      const result = await deleteAdminAction(id);

      if (result.success) {
        onSuccess?.(id);
      } else {
        onError?.(result.error || 'Failed to delete admin');
      }
    });
  };

  return {
    mutate,
    isPending,
  };
}

// ✅ Use Update Admin Status Hook
export function useUpdateAdminStatus(
  onSuccess?: (data: Profile) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = (id: string, status: 'active' | 'inactive' | 'suspended') => {
    startTransition(async () => {
      const result = await updateAdminStatusAction(id, status);

      if (result.success) {
        onSuccess?.(result.data as Profile);
      } else {
        onError?.(result.error || 'Failed to update admin status');
      }
    });
  };

  return {
    mutate,
    isPending,
  };
}

// ✅ Use Create Consumer Hook
export function useCreateConsumer(
  onSuccess?: () => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = (data: UserFormData) => {
    startTransition(async () => {
      const result = await createConsumerAction({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone_number: data.phone_number,
        avatar_url: data.avatar_url,
        role: 'user',
      });

      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Failed to create consumer');
      }
    });
  };

  return {
    mutate,
    isPending,
  };
}

// ✅ Use Update Consumer Hook
export function useUpdateConsumer(
  onSuccess?: (profile: Profile) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = (id: string, changes: AdminUpdateUserInput) => {
    startTransition(async () => {
      const result = await updateConsumerAction(id, changes);

      if (result.success) {
        onSuccess?.(result.data as Profile);
      } else {
        onError?.(result.error || 'Failed to update consumer');
      }
    });
  };

  return {
    mutate,
    isPending,
  };
}

// ✅ Use Delete Consumer Hook
export function useDeleteConsumer(
  onSuccess?: (id: string) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = (id: string) => {
    startTransition(async () => {
      const result = await deleteConsumerAction(id);

      if (result.success) {
        onSuccess?.(id);
      } else {
        onError?.(result.error || 'Failed to delete consumer');
      }
    });
  };

  return {
    mutate,
    isPending,
  };
}

// ✅ Use Create Business Owner Hook
export function useCreateBusinessOwner(
  onSuccess?: () => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = (data: UserFormData) => {
    startTransition(async () => {
      const result = await createBusinessOwnerAction({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone_number: data.phone_number,
        avatar_url: data.avatar_url,
        role: 'business_owner',
      });

      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Failed to create business owner');
      }
    });
  };

  return {
    mutate,
    isPending,
  };
}

// ✅ Use Update Business Owner Hook
export function useUpdateBusinessOwner(
  onSuccess?: (profile: Profile) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = (id: string, changes: AdminUpdateUserInput) => {
    startTransition(async () => {
      const result = await updateBusinessOwnerAction(id, changes);

      if (result.success) {
        onSuccess?.(result.data as Profile);
      } else {
        onError?.(result.error || 'Failed to update business owner');
      }
    });
  };

  return {
    mutate,
    isPending,
  };
}

// ✅ Use Delete Business Owner Hook
export function useDeleteBusinessOwner(
  onSuccess?: (id: string) => void,
  onError?: (err: string) => void,
) {
  const [isPending, startTransition] = useTransition();

  const mutate = (id: string) => {
    startTransition(async () => {
      const result = await deleteBusinessOwnerAction(id);

      if (result.success) {
        onSuccess?.(id);
      } else {
        onError?.(result.error || 'Failed to delete business owner');
      }
    });
  };

  return {
    mutate,
    isPending,
  };
}
