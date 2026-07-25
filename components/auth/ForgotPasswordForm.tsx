'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { toast } from 'sonner';
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

// Matches the route's per-account budget (8/300s) — a full-speed clicker can
// never exhaust it inside one window.
const RESEND_COOLDOWN_SECONDS = 60;

async function requestReset(email: string): Promise<void> {
  const res = await fetch(ROUTES.API.AUTH.RESET_PASSWORD, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'Something went wrong');
  }
}

export default function ForgotPasswordForm() {
  const [serverError, setServerError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ResetPasswordRequestInput>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setTimeout(
      () => setCooldown((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);

  function onSubmit(data: ResetPasswordRequestInput) {
    setServerError('');
    startTransition(async () => {
      try {
        // Always shows the same generic confirmation (no account enumeration).
        await requestReset(data.email);
        setSubmittedEmail(data.email);
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } catch {
        setServerError(
          'We could not process that request. Please try again in a moment.',
        );
      }
    });
  }

  function onResend() {
    if (!submittedEmail) return;
    startTransition(async () => {
      try {
        await requestReset(submittedEmail);
        toast.success('Reset link sent again. Give it a minute to arrive.', {
          id: 'resend-reset-link',
        });
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } catch {
        toast.error('Could not resend right now. Please try again shortly.', {
          id: 'resend-reset-link',
        });
      }
    });
  }

  if (submittedEmail) {
    return (
      <motion.div
        className="w-full max-w-sm space-y-6 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {/* role="status" scoped to the static copy — the resend countdown
            below must not re-announce the region every second. */}
        <div role="status" className="space-y-6">
          <div className="flex justify-center">
            <div className="bg-primary/10 rounded-full p-4">
              <MailCheck className="text-primary h-10 w-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Check your email
            </h1>
            <p className="text-muted-foreground text-sm">
              If an account exists for{' '}
              <span className="text-foreground font-medium">
                {submittedEmail}
              </span>
              , we&apos;ve sent a link to reset your password. The link expires
              in 1 hour.
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-4 text-left">
          <p className="text-sm font-medium">Didn&apos;t get the email?</p>
          <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
            <li>Check your spam or junk folder.</li>
            <li>Make sure the address above is spelled correctly.</li>
          </ul>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={onResend}
            disabled={isPending || cooldown > 0}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resending…
              </>
            ) : cooldown > 0 ? (
              `Resend email in ${cooldown}s`
            ) : (
              'Resend email'
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <Button asChild variant="ghost" className="w-full">
            <Link href={ROUTES.AUTH.SIGN_IN}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setSubmittedEmail(null)}
            className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
          >
            Use a different email
          </button>
        </div>
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
          <Link href={ROUTES.AUTH.SIGN_IN}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </Button>
      </form>
    </motion.div>
  );
}
