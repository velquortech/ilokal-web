'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  changeEmailSchema,
  type ChangeEmailInput,
} from '@/lib/validation/settings';
import { changeEmailAction } from '../../actions/settingsActions';
import { useBusinessShop } from '@/providers/BusinessProvider';
import { useUser } from '@/providers/UserContext';

interface ChangeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeEmailDialog({
  open,
  onOpenChange,
}: ChangeEmailDialogProps) {
  const { business } = useBusinessShop();
  const user = useUser();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const form = useForm<ChangeEmailInput>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: '', password: '' },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
      setServerError('');
      setSuccess(false);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: ChangeEmailInput) {
    if (!business?.id) return;
    setServerError('');
    setSuccess(false);
    const result = await changeEmailAction(business.id, values);
    if (result.success) {
      setSuccess(true);
      form.reset();
      setTimeout(() => handleOpenChange(false), 2000);
    } else {
      setServerError(result.error?.message ?? 'Something went wrong');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Email</DialogTitle>
          <DialogDescription>
            Current email: <span className="font-medium">{user?.email}</span>. A
            confirmation link will be sent to the new address.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="change-email-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="newEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
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
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertDescription>
                  Confirmation email sent. Click the link in your new inbox to
                  complete the change.
                </AlertDescription>
              </Alert>
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={form.formState.isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="change-email-form"
            disabled={form.formState.isSubmitting || success}
          >
            {form.formState.isSubmitting ? 'Sending...' : 'Change Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
