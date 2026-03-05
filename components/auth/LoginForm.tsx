'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@/lib/validation/auth';
import { useAuthStore } from '@/services/stores/authStore';
import { loginAction, redirectByRole } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function LoginForm() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
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
    <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
        <p className="text-sm text-slate-500">
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register('email')}
            disabled={isPending}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            disabled={isPending}
            className={errors.password ? 'border-red-500' : ''}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-black text-white hover:bg-slate-900"
        >
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
      <div className="text-center text-sm text-slate-600">
        Don't have an account?{' '}
        <Link
          href="/signup"
          className="font-semibold text-black hover:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
