'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { loginSchema, type LoginInput } from '@/lib/validation/auth';
import {
  signInAction,
  redirectByRole,
  checkMFARequiredAction,
  verifyMFALoginAction,
} from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, FieldError } from '@/components/ui/field';
import { ROUTES } from '@/config/routeConfig';
import { safeNext } from '@/lib/utils/safeNext';
import { isRedirectError } from '@/lib/utils/redirectError';
import type { User } from '@/lib/types';

type SignInStep = 'credentials' | 'mfa';

/**
 * Unified sign-in form for the /sign-in door (customers + business owners;
 * admins who land here are role-routed to /admin too). No portal choice — the
 * account's role decides the destination:
 *
 * - app_user → validated ?next= deep link, else /explore
 * - business_owner → /business/[businessId] (or /business/registration)
 * - admin → /admin
 *
 * Keeps the MFA elevation step for enrolled accounts (checkMFARequiredAction
 * is a no-op unless a verified TOTP factor exists) and the typed rate-limit
 * result so a 429 renders distinctly from bad credentials.
 */
function SignInFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<SignInStep>('credentials');
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

  /**
   * Post-auth routing shared by both steps. Customers get their validated
   * deep link back; everyone else goes to their role's home. `redirectByRole`
   * throws NEXT_REDIRECT on success — callers let isRedirectError pass it
   * through as navigation.
   */
  async function finishSignIn(role: string, businessId: string | null) {
    const next = safeNext(searchParams.get('next'));
    if (next && role === 'app_user') {
      router.replace(next);
      router.refresh();
      return;
    }
    await redirectByRole(role, businessId);
  }

  function onSubmit(data: LoginInput) {
    setServerError('');
    startTransition(async () => {
      try {
        const response = await signInAction(data.email, data.password);
        if ('rateLimited' in response) {
          setServerError(response.message);
          return;
        }

        // MFA elevation: no-op unless the account has a verified TOTP factor.
        const mfa = await checkMFARequiredAction();
        if (mfa.required && mfa.factorId) {
          setMfaFactorId(mfa.factorId);
          setPendingUser(response.user);
          setPendingBusinessId(response.businessId);
          setStep('mfa');
          return;
        }

        await finishSignIn(response.user.role, response.businessId);
      } catch (error) {
        // redirect() rejections are expected navigation, not failures.
        if (isRedirectError(error)) return;
        setServerError(
          error instanceof Error
            ? error.message
            : 'Failed to sign in. Please try again.',
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
    try {
      const result = await verifyMFALoginAction(mfaFactorId, mfaCode);
      if (!result.success) {
        setMfaError(result.error ?? 'Verification failed');
        setMfaLoading(false);
        return;
      }
      // Keep the button in its loading state through the redirect — the
      // navigation takes a moment and the component unmounts on success. The
      // session is elevated to AAL2 at this point, so always navigate; fall
      // back to the business role (the only one that enrolls MFA today) so a
      // missing pendingUser can't strand the spinner.
      await finishSignIn(
        pendingUser?.role ?? 'business_owner',
        pendingBusinessId,
      );
    } catch (error) {
      // finishSignIn throws NEXT_REDIRECT on success — let navigation proceed
      // (leave the loading state on). Any other error stops the spinner.
      if (isRedirectError(error)) return;
      setMfaError(
        error instanceof Error ? error.message : 'Verification failed',
      );
      setMfaLoading(false);
    }
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
            Back to sign in
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
      <div className="space-y-1">
        <div className="bg-primary text-primary-foreground mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
          <UserRound className="h-3.5 w-3.5" />
          Sign in
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          One account for everything iLokal — customers and business owners both
          sign in here, and we&apos;ll take you to the right place.
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
      </div>
    </motion.div>
  );
}

export default function SignInForm() {
  return (
    <Suspense fallback={null}>
      <SignInFormContent />
    </Suspense>
  );
}
