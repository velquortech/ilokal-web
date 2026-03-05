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
  onSuccess?: (profile: unknown) => void,
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
    onSuccess: (updatedProfile) => {
      // Update all admin profiles queries with the new data
      queryClient.setQueriesData(
        { queryKey: ['profiles', 'admin'], type: 'active' },
        (oldData: unknown) => {
          if (
            oldData &&
            typeof oldData === 'object' &&
            'data' in oldData &&
            Array.isArray((oldData as { data: unknown[] }).data)
          ) {
            const data = oldData as { data: unknown[]; pagination: unknown };
            return {
              ...data,
              data: (data.data as unknown[]).map((profile: unknown) =>
                typeof profile === 'object' &&
                profile !== null &&
                'id' in profile &&
                (profile as { id: unknown }).id === updatedProfile.id
                  ? updatedProfile
                  : profile,
              ),
            };
          }
          return oldData;
        },
      );
      onSuccess?.(updatedProfile);
    },
    onError,
  });
}

export function useDeleteAdmin(
  onSuccess?: (id: string) => void,
  onError?: (err: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.deleteProfile(id),
    onSuccess: (_, deletedId) => {
      // Remove deleted profile from all admin profiles queries
      queryClient.setQueriesData(
        { queryKey: ['profiles', 'admin'], type: 'active' },
        (oldData: unknown) => {
          if (
            oldData &&
            typeof oldData === 'object' &&
            'data' in oldData &&
            Array.isArray((oldData as { data: unknown[] }).data)
          ) {
            const data = oldData as {
              data: unknown[];
              pagination: { totalItems: number };
            };
            return {
              ...data,
              data: (data.data as unknown[]).filter(
                (profile: unknown) =>
                  !(
                    typeof profile === 'object' &&
                    profile !== null &&
                    'id' in profile &&
                    (profile as { id: unknown }).id === deletedId
                  ),
              ),
              pagination: {
                ...data.pagination,
                totalItems: data.pagination.totalItems - 1,
              },
            };
          }
          return oldData;
        },
      );
      onSuccess?.(deletedId);
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
    onSuccess: (updatedProfile) => {
      // Update all admin profiles queries with the new status
      queryClient.setQueriesData(
        { queryKey: ['profiles', 'admin'], type: 'active' },
        (oldData: unknown) => {
          if (
            oldData &&
            typeof oldData === 'object' &&
            'data' in oldData &&
            Array.isArray((oldData as { data: unknown[] }).data)
          ) {
            const data = oldData as { data: unknown[]; pagination: unknown };
            return {
              ...data,
              data: (data.data as unknown[]).map((profile: unknown) =>
                typeof profile === 'object' &&
                profile !== null &&
                'id' in profile &&
                (profile as { id: unknown }).id === updatedProfile.id
                  ? updatedProfile
                  : profile,
              ),
            };
          }
          return oldData;
        },
      );
      onSuccess?.(updatedProfile);
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
  onSuccess?: (profile: unknown) => void,
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
    onSuccess: (updatedProfile) => {
      // Update all consumer (user role) profiles queries with the new data
      queryClient.setQueriesData(
        { queryKey: ['profiles', 'user'], type: 'active' },
        (oldData: unknown) => {
          if (
            oldData &&
            typeof oldData === 'object' &&
            'data' in oldData &&
            Array.isArray((oldData as { data: unknown[] }).data)
          ) {
            const data = oldData as { data: unknown[]; pagination: unknown };
            return {
              ...data,
              data: (data.data as unknown[]).map((profile: unknown) =>
                typeof profile === 'object' &&
                profile !== null &&
                'id' in profile &&
                (profile as { id: unknown }).id === updatedProfile.id
                  ? updatedProfile
                  : profile,
              ),
            };
          }
          return oldData;
        },
      );
      onSuccess?.(updatedProfile);
    },
    onError,
  });
}

export function useDeleteConsumer(
  onSuccess?: (id: string) => void,
  onError?: (err: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.deleteProfile(id),
    onSuccess: (_, deletedId) => {
      // Remove deleted profile from all consumer (user role) profiles queries
      queryClient.setQueriesData(
        { queryKey: ['profiles', 'user'], type: 'active' },
        (oldData: unknown) => {
          if (
            oldData &&
            typeof oldData === 'object' &&
            'data' in oldData &&
            Array.isArray((oldData as { data: unknown[] }).data)
          ) {
            const data = oldData as {
              data: unknown[];
              pagination: { totalItems: number };
            };
            return {
              ...data,
              data: (data.data as unknown[]).filter(
                (profile: unknown) =>
                  !(
                    typeof profile === 'object' &&
                    profile !== null &&
                    'id' in profile &&
                    (profile as { id: unknown }).id === deletedId
                  ),
              ),
              pagination: {
                ...data.pagination,
                totalItems: data.pagination.totalItems - 1,
              },
            };
          }
          return oldData;
        },
      );
      onSuccess?.(deletedId);
    },
    onError,
  });
}

export function useCreateBusinessOwner(
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
        role: 'business_owner',
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

export function useUpdateBusinessOwner(
  onSuccess?: (profile: unknown) => void,
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
    onSuccess: (updatedProfile) => {
      // Update all business_owner profiles queries with the new data
      queryClient.setQueriesData(
        { queryKey: ['profiles', 'business_owner'], type: 'active' },
        (oldData: unknown) => {
          if (
            oldData &&
            typeof oldData === 'object' &&
            'data' in oldData &&
            Array.isArray((oldData as { data: unknown[] }).data)
          ) {
            const data = oldData as { data: unknown[]; pagination: unknown };
            return {
              ...data,
              data: (data.data as unknown[]).map((profile: unknown) =>
                typeof profile === 'object' &&
                profile !== null &&
                'id' in profile &&
                (profile as { id: unknown }).id === updatedProfile.id
                  ? updatedProfile
                  : profile,
              ),
            };
          }
          return oldData;
        },
      );
      onSuccess?.(updatedProfile);
    },
    onError,
  });
}

export function useDeleteBusinessOwner(
  onSuccess?: (id: string) => void,
  onError?: (err: unknown) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.deleteProfile(id),
    onSuccess: (_, deletedId) => {
      // Remove deleted profile from all business_owner profiles queries
      queryClient.setQueriesData(
        { queryKey: ['profiles', 'business_owner'], type: 'active' },
        (oldData: unknown) => {
          if (
            oldData &&
            typeof oldData === 'object' &&
            'data' in oldData &&
            Array.isArray((oldData as { data: unknown[] }).data)
          ) {
            const data = oldData as {
              data: unknown[];
              pagination: { totalItems: number };
            };
            return {
              ...data,
              data: (data.data as unknown[]).filter(
                (profile: unknown) =>
                  !(
                    typeof profile === 'object' &&
                    profile !== null &&
                    'id' in profile &&
                    (profile as { id: unknown }).id === deletedId
                  ),
              ),
              pagination: {
                ...data.pagination,
                totalItems: data.pagination.totalItems - 1,
              },
            };
          }
          return oldData;
        },
      );
      onSuccess?.(deletedId);
    },
    onError,
  });
}
