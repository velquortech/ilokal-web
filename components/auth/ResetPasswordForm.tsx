'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  resetPasswordFormSchema,
  type ResetPasswordFormInput,
} from '@/lib/validation/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError } from '@/components/ui/field';
import { ROUTES } from '@/config/routeConfig';

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get('token_hash');

  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  function onSubmit(data: ResetPasswordFormInput) {
    if (!tokenHash) return;
    setServerError('');
    startTransition(async () => {
      try {
        const res = await fetch(ROUTES.API.AUTH.RESET_PASSWORD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token_hash: tokenHash,
            password: data.password,
          }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success) {
          throw new Error(
            body?.error?.message ??
              'This reset link is invalid or has expired.',
          );
        }
        toast.success('Password updated. Please sign in.');
        router.push(`${ROUTES.AUTH.BUSINESS_LOGIN}?reset=1`);
      } catch (err) {
        setServerError(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.',
        );
      }
    });
  }

  // Missing/blank token → the link is malformed or was opened directly.
  if (!tokenHash) {
    return (
      <motion.div
        className="w-full max-w-sm space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This password reset link is invalid or incomplete. Please request a
            new one.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-full">
          <Link href={ROUTES.AUTH.FORGOT_PASSWORD}>Request a new link</Link>
        </Button>
      </motion.div>
    );
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
          <ShieldCheck className="h-3.5 w-3.5" />
          Set new password
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-muted-foreground text-sm">
          Use at least 6 characters with an uppercase letter, a lowercase
          letter, and a number.
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
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                  className="pr-10"
                  {...field}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-3 flex items-center transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
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
              Updating…
            </>
          ) : (
            'Update password'
          )}
        </Button>

        <Button asChild variant="ghost" className="w-full">
          <Link href={ROUTES.AUTH.BUSINESS_LOGIN}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </Button>
      </form>
    </motion.div>
  );
}
