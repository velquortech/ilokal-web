'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { AlertCircle, Loader2, UserRound } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/lib/validation/auth';
import { loginAction, redirectByRole } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError } from '@/components/ui/field';
import { ROUTES } from '@/config/routeConfig';

/** Only same-origin relative paths may be used as a post-login target. */
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

function CustomerLoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState('');
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(data: LoginInput) {
    setServerError('');
    startTransition(async () => {
      try {
        const response = await loginAction(data.email, data.password);
        const next = safeNext(searchParams.get('next'));
        if (next && response.user.role === 'app_user') {
          router.replace(next);
          router.refresh();
          return;
        }
        await redirectByRole(response.user.role);
      } catch (error) {
        // redirect() rejections are expected navigation, not failures.
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
          return;
        }
        setServerError(
          error instanceof Error
            ? error.message
            : 'Failed to sign in. Please try again.',
        );
      }
    });
  }

  return (
    <motion.div
      className="w-full max-w-sm space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="space-y-1">
        <div className="bg-primary text-primary-foreground mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
          <UserRound className="h-3.5 w-3.5" />
          Customer sign in
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to redeem deals, follow shops, and open your wallet — the same
          account you use on the iLokal app.
        </p>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isPending}
                aria-invalid={fieldState.invalid}
                {...field}
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href={ROUTES.AUTH.FORGOT_PASSWORD}
                  className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isPending}
                aria-invalid={fieldState.invalid}
                {...field}
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <div className="text-muted-foreground space-y-2 text-center text-sm">
        <p>
          New here?{' '}
          <Link
            href={ROUTES.AUTH.SIGNUP}
            className="text-foreground font-medium underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
        <p>
          Business owner?{' '}
          <Link
            href={ROUTES.AUTH.BUSINESS_LOGIN}
            className="text-foreground font-medium underline underline-offset-4"
          >
            Business login
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

export default function CustomerLoginForm() {
  return (
    <Suspense fallback={null}>
      <CustomerLoginFormContent />
    </Suspense>
  );
}
