'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Loader2,
  MailCheck,
} from 'lucide-react';
import {
  resetPasswordRequestSchema,
  type ResetPasswordRequestInput,
} from '@/lib/validation/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError } from '@/components/ui/field';
import { ROUTES } from '@/config/routeConfig';

export default function ForgotPasswordForm() {
  const [serverError, setServerError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ResetPasswordRequestInput>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: { email: '' },
  });

  function onSubmit(data: ResetPasswordRequestInput) {
    setServerError('');
    startTransition(async () => {
      try {
        const res = await fetch(ROUTES.API.AUTH.RESET_PASSWORD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? 'Something went wrong');
        }
        // Always show the same generic confirmation (no account enumeration).
        setSubmittedEmail(data.email);
      } catch {
        setServerError(
          'We could not process that request. Please try again in a moment.',
        );
      }
    });
  }

  if (submittedEmail) {
    return (
      <motion.div
        className="w-full max-w-sm space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
          <MailCheck className="text-primary h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Check your email
          </h1>
          <p className="text-muted-foreground text-sm">
            If an account exists for{' '}
            <span className="text-foreground font-medium">
              {submittedEmail}
            </span>
            , we&apos;ve sent a link to reset your password. The link expires in
            1 hour.
          </p>
        </div>
        <p className="text-muted-foreground text-sm">
          Didn&apos;t get it? Check your spam folder, or{' '}
          <button
            type="button"
            onClick={() => setSubmittedEmail(null)}
            className="text-foreground font-medium underline underline-offset-4"
          >
            try again
          </button>
          .
        </p>
        <Button asChild variant="ghost" className="w-full">
          <Link href={ROUTES.AUTH.BUSINESS_LOGIN}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
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
          <KeyRound className="h-3.5 w-3.5" />
          Password reset
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Forgot your password?
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your account email and we&apos;ll send you a reset link.
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
              <Label htmlFor="email">Email address</Label>
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

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            'Send reset link'
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
