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
  type AdminEditFormData,
} from '@/lib/schemas/userFormSchema';
import { UserFormModalProps } from '@/lib/types/forms';
import { getRoleFromUserType } from '@/lib/utils/roleMapper';
import { baseFormFields } from '../../../constants/formFields';
import { InputFormFields } from '@/lib/components/FormFields';
import { UserEditForm } from '../shared';
import { Profile } from '@/lib/types/user';

const getUserLabel = (userType: string): string => {
  const labels: Record<string, string> = {
    admin: 'Admin',
    business_owner: 'Business Owner',
    user: 'User',
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
  role: getRoleFromUserType(userType),
  status: 'inactive',
  phone_number: '',
  avatar_url: '',
});

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  userType,
  initialData,
  error,
}: UserFormModalProps) {
  const isEditMode = !!initialData;
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
    return isEditMode ? `Edit ${userLabel}` : `Create New ${userLabel}`;
  };

  const handleSubmit = (data: UserFormData) => {
    // During creation, don't send avatar_url since we don't have the user's UID yet
    // Users can add/update their avatar after account creation during edit
    if (!isEditMode) {
      data.avatar_url = '';
    }
    onSubmit(data);
  };

  const handleEditSubmit = async (data: AdminEditFormData) => {
    const role = getRoleFromUserType(userType);
    onSubmit({
      email: data.email,
      full_name: data.full_name,
      password: data.password || '',
      confirm_password: data.password || '',
      phone_number: data.phone_number,
      avatar_url: data.avatar_url || '',
      role,
      status: 'inactive', // Default for new users only; existing status managed by StatusDropdown
    } as UserFormData);
  };

  const shouldShowField = (field?: string[]) =>
    !field || field.includes(userType);

  // Filter out avatar field during creation since we don't have user's UID yet
  const formFieldsToDisplay = isEditMode
    ? baseFormFields
    : baseFormFields.filter((f) => f.name !== 'avatar_url');

  // Render edit form for admins
  if (isEditMode && userType === 'admin') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>
              Update the admin account details below
            </DialogDescription>
          </DialogHeader>

          <UserEditForm
            user={initialData as unknown as Profile}
            onSubmit={handleEditSubmit}
            onCancel={onClose}
            isSubmitting={false}
            error={error}
            submitButtonLabel={`Update ${getUserLabel(userType)}`}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Render create form
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the user details below'
              : 'Fill in the details to create a new user account'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <InputFormFields
              control={form.control}
              fields={formFieldsToDisplay}
              shouldShowField={shouldShowField}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">{isEditMode ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
