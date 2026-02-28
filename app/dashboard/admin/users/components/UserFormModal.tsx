'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { UserRole } from '@/lib/types/user';

const formSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    business_name: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    verification_status: z
      .enum(['pending', 'verified', 'suspended', 'rejected'])
      .optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

type FormData = z.infer<typeof formSchema>;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    formData: Omit<FormData, 'confirm_password'> & { role: UserRole },
  ) => void;
  userType: 'admin' | 'business_owner' | 'consumer';
  initialData?: Partial<FormData> & { created_at?: string };
}

const getRoleFromUserType = (userType: string): UserRole => {
  const roleMap = {
    admin: 'admin' as const,
    business_owner: 'business_owner' as const,
    consumer: 'consumer' as const,
  };
  return roleMap[userType as keyof typeof roleMap];
};

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  userType,
  initialData,
}: UserFormModalProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: initialData?.email || '',
      full_name: initialData?.full_name || '',
      business_name: initialData?.business_name || '',
      password: '',
      confirm_password: '',
      status:
        userType !== 'business_owner'
          ? (initialData?.status as 'active' | 'inactive' | 'suspended') ||
            'active'
          : undefined,
      verification_status:
        userType === 'business_owner'
          ? (initialData?.verification_status as
              | 'pending'
              | 'verified'
              | 'suspended'
              | 'rejected') || 'pending'
          : undefined,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        email: initialData?.email || '',
        full_name: initialData?.full_name || '',
        business_name: initialData?.business_name || '',
        password: '',
        confirm_password: '',
        status:
          userType !== 'business_owner'
            ? (initialData?.status as 'active' | 'inactive' | 'suspended') ||
              'active'
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
    }
  }, [initialData, isOpen, form, userType]);

  const getTitle = () => {
    const userLabel =
      userType === 'admin'
        ? 'Admin'
        : userType === 'business_owner'
          ? 'Business Owner'
          : 'Consumer';
    return initialData ? `Edit ${userLabel}` : `Create New ${userLabel}`;
  };

  const handleSubmit = (data: FormData) => {
    const { confirm_password, ...submitData } = data;
    const role = getRoleFromUserType(userType);
    onSubmit({ ...submitData, role });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="user@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {userType === 'business_owner' && (
              <FormField
                control={form.control}
                name="business_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your Business Name"
                        type="text"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Confirm password"
                      type="password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(userType === 'admin' || userType === 'consumer') && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        {userType === 'consumer' && (
                          <SelectItem value="suspended">Suspended</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {userType === 'business_owner' && (
              <FormField
                control={form.control}
                name="verification_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Status</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
