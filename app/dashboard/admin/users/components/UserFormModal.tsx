'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import {
  userFormSchema,
  type UserFormData,
} from '@/lib/schemas/userFormSchema';
import { UserFormModalProps } from '@/lib/types/forms';
import { getRoleFromUserType } from '@/lib/utils/roleMapper';
import { baseFormFields, selectFields } from '../constants/formFields';
import { InputFormFields, SelectFormFields } from './FormFields';

const getUserLabel = (userType: string): string => {
  const labels: Record<string, string> = {
    admin: 'Admin',
    business_owner: 'Business Owner',
    user: 'user',
  };
  return labels[userType] || userType;
};

const getDefaultValues = (
  userType: string,
  initialData?: Record<string, unknown>,
): UserFormData => ({
  email: (initialData?.email as string) || '',
  full_name: (initialData?.full_name as string) || '',
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

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  userType,
  initialData,
}: UserFormModalProps) {
  const defaultValues = useMemo(
    () => getDefaultValues(userType, initialData),
    [userType, initialData?.email],
  );

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen, defaultValues, form]);

  const getTitle = () => {
    const userLabel = getUserLabel(userType);
    return initialData ? `Edit ${userLabel}` : `Create New ${userLabel}`;
  };

  const handleSubmit = (data: UserFormData) => {
    const { ...submitData } = data;
    const role = getRoleFromUserType(userType);
    onSubmit({ ...submitData, role });
  };

  const shouldShowField = (field?: string[]) =>
    !field || field.includes(userType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-100.25">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update the user details below'
              : 'Fill in the details to create a new user account'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <InputFormFields
              control={form.control}
              fields={baseFormFields}
              shouldShowField={shouldShowField}
            />

            <SelectFormFields
              control={form.control}
              selectFields={selectFields}
              shouldShowField={shouldShowField}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">{initialData ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
