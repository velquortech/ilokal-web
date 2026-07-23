'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { signupSchema, SignupInput } from '@/lib/validation/auth';
import { signupFormAction } from '@/app/(auth)/actions';
import { ROUTES } from '@/config/routeConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, EyeOff, Store, User, Loader2, CheckCircle2 } from 'lucide-react';

function getRouteForRole(role?: string) {
  switch (role) {
    case 'admin':
      return ROUTES.DASHBOARD.ADMIN;
    case 'business_owner':
      return ROUTES.DASHBOARD.BUSINESS;
    default:
      return ROUTES.BUSINESS.home;
  }
}

const ROLE_OPTIONS = [
  {
    value: 'business_owner',
    id: 'role-business',
    icon: Store,
    title: 'Business Owner',
    description: 'Manage your shop, create offers, and grow your business',
  },
  {
    value: 'app_user',
    id: 'role-customer',
    icon: User,
    title: 'Customer',
    description: 'Discover local businesses, find deals, and enjoy rewards',
  },
];

function SignupFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = searchParams.get('mobile') === 'true';
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'app_user' },
    mode: 'onBlur',
  });
  const selectedRole = watch('role');
  const [isPending, setIsPending] = useState(false);
  const [state, setState] = useState<
    Awaited<ReturnType<typeof signupFormAction>>
  >({});
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // One sequential flow instead of useEffects reacting to action state: the
  // same toast id is updated in place (loading → error/success), so a stale
  // "Creating your account..." can never outlive the request.
  const onSubmit = handleSubmit(async (values) => {
    const toastId = 'signup-pending';
    setIsPending(true);
    toast.loading('Creating your account...', { id: toastId });
    try {
      const formData = new FormData();
      formData.set('name', values.name);
      formData.set('email', values.email);
      formData.set('password', values.password);
      formData.set('confirmPassword', values.confirmPassword);
      formData.set('role', values.role);

      const result = await signupFormAction(undefined, formData);
      setState(result);

      const fieldError = result.fieldErrors
        ? Object.values(result.fieldErrors)[0]
        : undefined;
      if (result.error || fieldError) {
        toast.error(result.error ?? fieldError, { id: toastId });
        return;
      }

      if (!result.success) {
        toast.error('Failed to sign up. Please try again.', { id: toastId });
        return;
      }

      if (isMobile) {
        // Mobile app signups get a modal instead of a redirect.
        toast.dismiss(toastId);
        setShowSuccessModal(true);
        return;
      }

      toast.success(
        result.role === 'business_owner'
          ? 'Welcome! Your business account is ready.'
          : 'Welcome! Your account is ready.',
        { id: toastId },
      );
      setTimeout(() => router.push(getRouteForRole(result.role)), 2000);
    } catch {
      toast.error('Failed to sign up. Please try again.', { id: toastId });
    } finally {
      setIsPending(false);
    }
  });

  return (
    <div className="w-full max-w-md space-y-6">
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <div className="bg-primary/10 mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full">
              <CheckCircle2 className="text-primary animate-in zoom-in-50 h-8 w-8 duration-300" />
            </div>
            <DialogTitle className="text-center text-xl">
              Account Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-center">
              {state.role === 'business_owner'
                ? 'Your business account is ready to use. You can now manage your shop from the mobile app.'
                : 'Your account is ready to use. Start exploring local businesses and discovering amazing deals!'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="w-full"
              size="lg"
            >
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
        <p className="text-muted-foreground">
          Join Ilokal and start your journey
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3">
        <StepDot index={1} active />
        <div
          className={cn(
            'h-px w-10 transition-colors',
            step === 'details' ? 'bg-primary' : 'bg-border',
          )}
        />
        <StepDot index={2} active={step === 'details'} />
      </div>

      {step === 'role' && (
        <Card>
          <CardHeader>
            <CardTitle>What type of account are you?</CardTitle>
            <CardDescription>
              Choose the account type that best describes you. This helps us
              personalise your experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="space-y-3"
                >
                  {ROLE_OPTIONS.map(
                    ({ value, id, icon: Icon, title, description }) => (
                      <label
                        key={value}
                        htmlFor={id}
                        className="border-border hover:bg-accent has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10 flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors"
                      >
                        <RadioGroupItem
                          value={value}
                          id={id}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Icon className="text-muted-foreground h-5 w-5" />
                            <span className="font-semibold">{title}</span>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {description}
                          </p>
                        </div>
                      </label>
                    ),
                  )}
                </RadioGroup>
              )}
            />
            {errors.role && <FieldError errors={[errors.role]} />}
            <Button
              onClick={() => setStep('details')}
              className="w-full"
              size="lg"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle>Your Details</CardTitle>
            <CardDescription>
              {selectedRole === 'business_owner'
                ? 'Tell us about your business'
                : 'Help us get to know you better'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field data-invalid={!!errors.name || !!state.fieldErrors?.name}>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  placeholder={
                    selectedRole === 'business_owner'
                      ? 'Business Owner Name'
                      : 'Your Name'
                  }
                  {...register('name')}
                  disabled={isPending}
                />
                <FieldError
                  errors={[
                    errors.name,
                    state.fieldErrors?.name
                      ? { message: state.fieldErrors.name }
                      : undefined,
                  ]}
                />
              </Field>

              <Field
                data-invalid={!!errors.email || !!state.fieldErrors?.email}
              >
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  disabled={isPending}
                />
                <FieldError
                  errors={[
                    errors.email,
                    state.fieldErrors?.email
                      ? { message: state.fieldErrors.email }
                      : undefined,
                  ]}
                />
              </Field>

              <Field
                data-invalid={
                  !!errors.password || !!state.fieldErrors?.password
                }
              >
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    disabled={isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FieldDescription>
                  At least 6 characters with uppercase, lowercase, and a number
                </FieldDescription>
                <FieldError
                  errors={[
                    errors.password,
                    state.fieldErrors?.password
                      ? { message: state.fieldErrors.password }
                      : undefined,
                  ]}
                />
              </Field>

              <Field
                data-invalid={
                  !!errors.confirmPassword ||
                  !!state.fieldErrors?.confirmPassword
                }
              >
                <FieldLabel htmlFor="confirmPassword">
                  Confirm Password
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    disabled={isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
                    aria-label={
                      showConfirm
                        ? 'Hide confirm password'
                        : 'Show confirm password'
                    }
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <FieldError
                  errors={[
                    errors.confirmPassword,
                    state.fieldErrors?.confirmPassword
                      ? { message: state.fieldErrors.confirmPassword }
                      : undefined,
                  ]}
                />
              </Field>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setStep('role')}
                  disabled={isPending}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="flex-1"
                  size="lg"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link
          href={ROUTES.AUTH.LOGIN}
          className="text-foreground hover:text-primary font-semibold transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupForm() {
  return (
    <Suspense fallback={<div />}>
      <SignupFormContent />
    </Suspense>
  );
}

function StepDot({ index, active }: { index: number; active: boolean }) {
  return (
    <div
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {index}
    </div>
  );
}
