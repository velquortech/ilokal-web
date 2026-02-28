import { UserFormData } from '@/lib/schemas/userFormSchema';

const getDefaultValues = (
  userType: string,
  initialData?: Partial<UserFormData>,
): UserFormData => ({
  email: initialData?.email || '',
  full_name: initialData?.full_name || '',
  business_name: initialData?.business_name || '',
  password: '',
  confirm_password: '',
  status:
    userType !== 'business_owner'
      ? (initialData?.status as 'active' | 'inactive' | 'suspended') || 'active'
      : undefined,
  verification_status:
    userType === 'business_owner'
      ? (initialData?.verification_status as
          | 'pending'
          | 'verified'
          | 'suspended'
          | 'rejected') || 'pending'
      : undefined,
});

export const useUserFormDefaults = (
  userType: string,
  initialData?: Partial<UserFormData>,
) => getDefaultValues(userType, initialData);
