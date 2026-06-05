'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

export function ChangeEmailForm() {
  const { business } = useBusinessShop();
  const user = useUser();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const form = useForm<ChangeEmailInput>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: '', password: '' },
  });

  async function onSubmit(values: ChangeEmailInput) {
    if (!business?.id) return;
    setServerError('');
    setSuccess(false);
    const result = await changeEmailAction(business.id, values);
    if (result.success) {
      setSuccess(true);
      form.reset();
    } else {
      setServerError(result.error?.message ?? 'Something went wrong');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change Email</CardTitle>
        <CardDescription>
          Current email: <span className="font-medium">{user?.email}</span>. A
          confirmation link will be sent to the new address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
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
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="self-start"
            >
              {form.formState.isSubmitting ? 'Sending...' : 'Change Email'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
