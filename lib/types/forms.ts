import { UserRole } from './user';
import { UserFormData } from '@/lib/schemas/userFormSchema';

export type FormFieldConfig = {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  showFor?: string[];
};

export interface SelectFieldConfig extends Omit<FormFieldConfig, 'type'> {
  options: { value: string; label: string }[];
}

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    formData: Omit<UserFormData, 'confirm_password'> & { role: UserRole },
  ) => void;
  userType: 'admin' | 'business_owner' | 'user';
  initialData?: Partial<UserFormData> & { created_at?: string };
}
