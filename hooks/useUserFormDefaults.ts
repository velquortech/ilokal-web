import { UserFormData } from '@/lib/schemas/userFormSchema';

const getDefaultValues = (
  userType: string,
  initialData?: Partial<UserFormData>,
): UserFormData => ({
  email: initialData?.email || '',
  full_name: initialData?.full_name || '',
  password: '',
  confirm_password: '',
  role: (initialData?.role as 'admin' | 'business_owner' | 'user') || userType,
  status:
    userType !== 'business_owner'
      ? (initialData?.status as 'active' | 'inactive' | 'suspended') || 'active'
      : undefined,
});

export const useUserFormDefaults = (
  userType: string,
  initialData?: Partial<UserFormData>,
) => getDefaultValues(userType, initialData);
