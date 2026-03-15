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
    reset,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    // Clear any previous errors when starting new submission
    setApiError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        // Call Server Action for secure authentication
        const response = await loginAction(data.email, data.password);

        // Update local auth state with user data
        setUser(response.user);

        // Show success message briefly before redirect
        setSuccessMessage('Login successful! Redirecting...');

        // Reset form state
        reset();

        // Redirect based on user role - let redirect() throw (expected behavior)
        await redirectByRole(response.user.role);
      } catch (error) {
        // Handle redirect() which the framework throws internally - expected
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
          // This is expected - redirect() throws internally in Next.js
          return;
        }

        // Set error from actual auth failures
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

      {successMessage && (
        <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-green-600" />
          </div>
          <p>{successMessage}</p>
        </div>
      )}

      {apiError && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{apiError}</p>
        </div>
      )}

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
            className={`transition-colors ${
              errors.email ? 'border-red-500 focus:border-red-500' : ''
            }`}
            onFocus={() => {
              if (apiError) setApiError(null);
            }}
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
            className={`transition-colors ${
              errors.password ? 'border-red-500 focus:border-red-500' : ''
            }`}
            onFocus={() => {
              if (apiError) setApiError(null);
            }}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending || !!successMessage}
          className="w-full bg-black text-white hover:bg-slate-900 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : successMessage ? (
            'Redirecting...'
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
