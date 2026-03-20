import { UserFormData } from '@/app/admin/schemas/userFormSchema';

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
  onSubmit: (formData: UserFormData) => void | Promise<void>;
  userType: 'admin' | 'business_owner' | 'app_user';
  initialData?: Partial<UserFormData> & { created_at?: string };
  error?: string | null;
}
