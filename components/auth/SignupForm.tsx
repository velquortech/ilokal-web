'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { signupSchema, SignupInput } from '@/lib/validation/auth';
import { signupAction, redirectByRole } from '@/app/(auth)/actions';
import { ROUTES } from '@/config/routeConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Store,
  User,
} from 'lucide-react';

type SignupFormState = {
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const EMAIL_ERRORS = new Set([
  'Email already registered',
  'Invalid email format',
  'User already registered',
]);

async function handleSignup(
  _state: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const data = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    phone_number: (formData.get('phone_number') as string) || null,
    role: formData.get('role') as string,
    avatar_url: (formData.get('avatar_url') as string) || null,
  };

  const result = signupSchema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? 'root');
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors };
  }

  try {
    const response = await signupAction(result.data);
    await redirectByRole(response.user.role);
    return { message: response.message };
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      return { message: 'Account created! Redirecting...' };
    }
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to sign up. Please try again.';

    if (
      EMAIL_ERRORS.has(message) ||
      message.toLowerCase().includes('email already')
    ) {
      return { fieldErrors: { email: message } };
    }

    return { error: message };
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

export default function SignupForm() {
  const {
    control,
    register,
    trigger,
    formState: { errors },
    watch,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'app_user' },
    mode: 'onBlur',
  });
  const selectedRole = watch('role');
  const [state, formAction, isPending] = useActionState(handleSignup, {
    message: '',
    error: '',
  });
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="w-full max-w-md space-y-6">
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

      {state.message && (
        <Alert className="border-primary/30 bg-primary/5 text-primary dark:bg-primary/10">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-foreground">
            {state.message}
          </AlertDescription>
        </Alert>
      )}

      {state.error && !state.fieldErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

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
            <form
              action={formAction}
              onSubmit={async (e) => {
                const valid = await trigger([
                  'name',
                  'email',
                  'password',
                  'confirmPassword',
                ]);
                if (!valid) e.preventDefault();
              }}
              className="space-y-4"
            >
              <input type="hidden" name="role" value={selectedRole} />

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
