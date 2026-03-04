'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Profile } from '@/lib/types/user';
import {
  adminEditSchema,
  type AdminEditFormData,
} from '@/lib/schemas/userFormSchema';
import { PhoneNumberInput } from '../form/inputs/PhoneNumberInput';
import { AvatarUpload } from '../form/inputs/AvatarUpload';

interface UserEditFormProps {
  user: Profile;
  onSubmit: (data: AdminEditFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string | null;
  submitButtonLabel?: string;
}

export function UserEditForm({
  user,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
  submitButtonLabel = 'Update User',
}: UserEditFormProps) {
  const form = useForm<AdminEditFormData>({
    resolver: zodResolver(adminEditSchema),
    defaultValues: {
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
      email: user.email,
      password: '',
      avatar_url: user.avatar_url || '',
    },
  });

  useEffect(() => {
    form.reset({
      full_name: user.full_name || '',
      phone_number: user.phone_number || '',
      email: user.email,
      password: '',
      avatar_url: user.avatar_url || '',
    });
  }, [user, form]);

  const handleSubmit = async (data: AdminEditFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
          </div>
        )}

        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number (Optional)</FormLabel>
              <FormControl>
                <PhoneNumberInput
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="(917) 000-0000"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Leave empty to keep current password"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="avatar_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar (Optional)</FormLabel>
              <FormControl>
                <AvatarUpload
                  value={field.value || ''}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  currentAvatarUrl={user.avatar_url}
                  userId={user.id}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? `${submitButtonLabel}...` : submitButtonLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
