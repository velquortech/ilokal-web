'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@/lib/validation/auth';
import { loginAction, redirectByRole } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';

interface LoginFormState {
  message?: string;
  error?: string;
}

async function handleLogin(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    // Validate with zod schema
    const validationResult = loginSchema.safeParse({ email, password });
    if (!validationResult.success) {
      return { error: validationResult.error.issues[0].message };
    }

    // Call server action
    const response = await loginAction(email, password);

    // Redirect based on user role - let redirect() handle navigation
    // This will throw NEXT_REDIRECT which is handled by Next.js
    await redirectByRole(response.user.role);

    return { message: 'Login successful! Redirecting...' };
  } catch (error) {
    // Handle redirect() which is expected and handled by Next.js
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      return { message: 'Redirecting...' };
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to login. Please try again.';
    return { error: errorMessage };
  }
}

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(handleLogin, {
    message: '',
    error: '',
  });

  const {
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
        <p className="text-sm text-slate-500">
          Sign in to your account to continue
        </p>
      </div>

      {state.message && (
        <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-green-600" />
          </div>
          <p>{state.message}</p>
        </div>
      )}

      {state.error && (
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            disabled={isPending}
            className={`transition-colors ${
              errors.email ? 'border-red-500 focus:border-red-500' : ''
            }`}
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
            name="password"
            type="password"
            placeholder="••••••••"
            disabled={isPending}
            className={`transition-colors ${
              errors.password ? 'border-red-500 focus:border-red-500' : ''
            }`}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isPending || !!state.message}
          className="w-full bg-black text-white hover:bg-slate-900 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : state.message ? (
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
