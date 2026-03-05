import { useMutation, useQueryClient } from '@tanstack/react-query';
import userService from '@/services/api/userService';
import authService from '@/services/api/authService';
import { UserFormData } from '@/app/admin/schemas/userFormSchema';

export function useCreateAdmin(
  onSuccess?: () => void,
  onError?: (err: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UserFormData) => {
      const phoneNumber = data.phone_number?.trim();
      const hasPhoneNumber = phoneNumber && /\d/.test(phoneNumber);

      return await authService.signup({
        email: data.email,
        password: data.password,
        confirmPassword: data.confirm_password || '',
        name: data.full_name,
        role: data.role,
        ...(hasPhoneNumber && { phone_number: phoneNumber }),
        ...(data.avatar_url && { avatar_url: data.avatar_url }),
      });
    },
    onSuccess: () => {
      // Invalidate the profiles query to refetch
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onSuccess?.();
    },
    onError,
  });
}

export function useUpdateAdmin(
  onSuccess?: () => void,
  onError?: (err: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      changes,
    }: {
      id: string;
      changes: Record<string, unknown>;
    }) => userService.adminUpdateProfile(id, changes),
    onSuccess: async () => {
      // Invalidate all profiles queries to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onSuccess?.();
    },
    onError,
  });
}

export function useDeleteAdmin(
  onSuccess?: () => void,
  onError?: (err: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.deleteProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onSuccess?.();
    },
    onError,
  });
}

export function useUpdateAdminStatus(
  onSuccess?: (data: unknown) => void,
  onError?: (err: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'active' | 'inactive' | 'suspended';
    }) => userService.adminUpdateProfile(id, { status }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onSuccess?.(data);
    },
    onError,
  });
}

export function useCreateConsumer(
  onSuccess?: () => void,
  onError?: (err: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UserFormData) => {
      const phoneNumber = data.phone_number?.trim();
      const hasPhoneNumber = phoneNumber && /\d/.test(phoneNumber);

      return await authService.signup({
        email: data.email,
        password: data.password,
        confirmPassword: data.confirm_password || '',
        name: data.full_name,
        role: 'user',
        ...(hasPhoneNumber && { phone_number: phoneNumber }),
        ...(data.avatar_url && { avatar_url: data.avatar_url }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onSuccess?.();
    },
    onError,
  });
}

export function useUpdateConsumer(
  onSuccess?: () => void,
  onError?: (err: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      changes,
    }: {
      id: string;
      changes: Record<string, unknown>;
    }) => userService.adminUpdateProfile(id, changes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onSuccess?.();
    },
    onError,
  });
}

export function useDeleteConsumer(
  onSuccess?: () => void,
  onError?: (err: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.deleteProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onSuccess?.();
    },
    onError,
  });
}
