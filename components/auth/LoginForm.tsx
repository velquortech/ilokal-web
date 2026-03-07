'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@/lib/validation/auth';
import { useAuthStore } from '@/services/stores/authStore';
import { loginAction, redirectByRole } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function LoginForm() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const setUser = useAuthStore((state) => state.setUser);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    startTransition(async () => {
      try {
        setApiError(null);
        setSuccessMessage(null);

        // Call Server Action for secure authentication
        const response = await loginAction(data.email, data.password);

        // Update local auth state with user data
        setUser(response.user);

        // Show success message briefly before redirect
        setSuccessMessage('Login successful! Redirecting...');

        // Redirect based on user role (Server Action)
        // Note: redirect() from Next.js uses internal mechanism, don't catch its error
        redirectByRole(response.user.role).catch(() => {
          // Silently ignore redirect errors - they're expected
        });
      } catch (error) {
        // Only set error if we haven't already shown success
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to login. Please try again.';
        setApiError(errorMessage);
      }
    });
  };

  return (
    <div className="w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to your account to continue
        </p>
      </div>

      {successMessage ? (
        <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-green-600" />
          </div>
          <p>{successMessage}</p>
        </div>
      ) : apiError ? (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{apiError}</p>
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="email"
                placeholder="you@example.com"
                disabled={isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Password Field */}
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Password</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                placeholder="••••••••"
                disabled={isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Submit Button */}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      {/* Signup Link */}
      <div className="text-muted-foreground text-center text-sm">
        Don't have an account?{' '}
        <Link
          href="/signup"
          className="hover:text-foreground underline underline-offset-2"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
