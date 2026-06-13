'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { loginSchema, LoginInput } from '@/lib/validation/auth';
import {
  loginAsBusiness,
  redirectByRole,
  checkMFARequiredAction,
  verifyMFALoginAction,
} from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError } from '@/components/ui/field';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { ROUTES } from '@/config/routeConfig';
import type { User } from '@/lib/types';

type LoginStep = 'credentials' | 'mfa';

export default function BusinessLoginForm() {
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<LoginStep>('credentials');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [pendingBusinessId, setPendingBusinessId] = useState<string | null>(
    null,
  );

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(data: LoginInput) {
    setServerError('');
    startTransition(async () => {
      try {
        const response = await loginAsBusiness(data.email, data.password);

        // Check if MFA elevation is needed
        const mfa = await checkMFARequiredAction();
        if (mfa.required && mfa.factorId) {
          setMfaFactorId(mfa.factorId);
          setPendingUser(response.user);
          setPendingBusinessId(response.businessId);
          setStep('mfa');
          return;
        }

        await redirectByRole(response.user.role, response.businessId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('NEXT_REDIRECT'))
          return;
        setServerError(
          error instanceof Error
            ? error.message
            : 'Login failed. Please try again.',
        );
      }
    });
  }

  async function handleMFAVerify() {
    if (mfaCode.length !== 6) {
      setMfaError('Enter the 6-digit code from your authenticator app');
      return;
    }
    setMfaLoading(true);
    setMfaError('');
    const result = await verifyMFALoginAction(mfaFactorId, mfaCode);
    setMfaLoading(false);
    if (!result.success) {
      setMfaError(result.error ?? 'Verification failed');
      return;
    }
    if (pendingUser) await redirectByRole(pendingUser.role, pendingBusinessId);
  }

  if (step === 'mfa') {
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
            Two-Factor Verification
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Enter your code</h1>
          <p className="text-muted-foreground text-sm">
            Open your authenticator app and enter the 6-digit code.
          </p>
        </div>

        {mfaError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{mfaError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Label htmlFor="mfa-code">Verification Code</Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={mfaCode}
            onChange={(e) =>
              setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            className="text-center font-mono text-lg tracking-widest"
            autoFocus
          />
          <Button
            onClick={handleMFAVerify}
            disabled={mfaLoading || mfaCode.length !== 6}
            className="w-full"
          >
            {mfaLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              'Verify & Sign In'
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep('credentials');
              setMfaCode('');
              setMfaError('');
            }}
          >
            Back to login
          </Button>
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
      {/* Portal identity */}
      <div className="space-y-1">
        <div className="bg-primary text-primary-foreground mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
          <Building2 className="h-3.5 w-3.5" />
          Business Portal
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to manage your business
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

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
                  tabIndex={-1}
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

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <OAuthButtons disabled={isPending} />

      <div className="text-muted-foreground space-y-1.5 text-center text-sm">
        <p>
          Don&apos;t have an account?{' '}
          <Link
            href={ROUTES.AUTH.SIGNUP}
            className="text-foreground font-semibold hover:underline"
          >
            Sign up for free
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
