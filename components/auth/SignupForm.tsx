'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, SignupInput } from '@/lib/validation/auth';
import { signupAction, redirectByRole } from '@/app/(auth)/actions';
import { ROUTES } from '@/config/routeConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, Loader2, Store, User } from 'lucide-react';

interface SignupFormState {
  message?: string;
  error?: string;
}

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

  try {
    // Validate with zod schema
    const validationResult = signupSchema.safeParse(data);
    if (!validationResult.success) {
      return { error: validationResult.error.issues[0].message };
    }

    // Call server action
    const response = await signupAction(validationResult.data);

    // Redirect - let it throw (expected)
    await redirectByRole(response.user.role);

    return { message: response.message };
  } catch (error) {
    // Handle redirect() which is expected and handled by Next.js
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      return { message: 'Account created! Redirecting...' };
    }

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to sign up. Please try again.';
    return { error: errorMessage };
  }
}

export default function SignupForm() {
  // useForm for form state management (role selection UI)
  // useActionState for form submission with server validation
  const {
    control,
    register,
    formState: { errors },
    watch,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'app_user',
    },
  });

  const selectedRole = watch('role');

  const [state, formAction, isPending] = useActionState(handleSignup, {
    message: '',
    error: '',
  });
  const [step, setStep] = useState<'role' | 'details'>('role');

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Create Account</h1>
          <p className="text-lg text-slate-500">
            Join Ilokal and start your journey
          </p>
        </div>

        {/* Success Alert */}
        {state.message && (
          <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <p>{state.message}</p>
          </div>
        )}

        {/* Error Alert */}
        {state.error && (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}

        {/* Step 1: Role Selection */}
        {step === 'role' && (
          <Card className="border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle>What type of account are you?</CardTitle>
              <CardDescription>
                Choose the account type that best describes you. This helps us
                personalize your experience.
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
                  >
                    {/* Business Owner Option */}
                    <div className="space-y-3">
                      <label
                        htmlFor="business-owner"
                        className="flex cursor-pointer items-start space-x-4 rounded-lg border-2 border-slate-200 p-4 transition-all hover:border-slate-300 hover:bg-slate-50"
                        style={{
                          borderColor:
                            field.value === 'business_owner'
                              ? 'rgb(0, 0, 0)'
                              : 'rgb(226, 232, 240)',
                          backgroundColor:
                            field.value === 'business_owner'
                              ? 'rgb(245, 245, 245)'
                              : undefined,
                        }}
                      >
                        <RadioGroupItem
                          value="business_owner"
                          id="business-owner"
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <Store className="h-5 w-5 text-slate-600" />
                            <p className="font-semibold text-slate-900">
                              Business Owner
                            </p>
                          </div>
                          <p className="text-sm text-slate-600">
                            Manage your shop, create offers, and grow your
                            business
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Customer Option */}
                    <div className="space-y-3">
                      <label
                        htmlFor="customer"
                        className="flex cursor-pointer items-start space-x-4 rounded-lg border-2 border-slate-200 p-4 transition-all hover:border-slate-300 hover:bg-slate-50"
                        style={{
                          borderColor:
                            field.value === 'app_user'
                              ? 'rgb(0, 0, 0)'
                              : 'rgb(226, 232, 240)',
                          backgroundColor:
                            field.value === 'app_user'
                              ? 'rgb(245, 245, 245)'
                              : undefined,
                        }}
                      >
                        <RadioGroupItem
                          value="app_user"
                          id="customer"
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <User className="h-5 w-5 text-slate-600" />
                            <p className="font-semibold text-slate-900">
                              Customer
                            </p>
                          </div>
                          <p className="text-sm text-slate-600">
                            Discover local businesses, find deals, and enjoy
                            rewards
                          </p>
                        </div>
                      </label>
                    </div>
                  </RadioGroup>
                )}
              />

              {errors.role && (
                <p className="text-sm text-red-500">{errors.role.message}</p>
              )}

              <Button
                onClick={() => setStep('details')}
                className="w-full bg-black text-white hover:bg-slate-900"
                size="lg"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Account Details */}
        {step === 'details' && (
          <Card className="border-slate-200 shadow-lg">
            <CardHeader>
              <CardTitle>Provide Your Details</CardTitle>
              <CardDescription>
                {selectedRole === 'business_owner'
                  ? 'Tell us about your business'
                  : 'Help us get to know you better'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-5">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={
                      selectedRole === 'business_owner'
                        ? 'Business Owner Name'
                        : 'Your Name'
                    }
                    {...register('name')}
                    disabled={isPending}
                    className={`text-base transition-colors ${
                      errors.name ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register('email')}
                    disabled={isPending}
                    className={`text-base transition-colors ${
                      errors.email ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                    disabled={isPending}
                    className={`text-base transition-colors ${
                      errors.password
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500">
                      {errors.password.message}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Minimum 6 characters, use mix of upper/lowercase and numbers
                  </p>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    disabled={isPending}
                    className={`text-base transition-colors ${
                      errors.confirmPassword
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
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
                    className="flex-1 bg-black text-white hover:bg-slate-900 disabled:cursor-not-allowed"
                    size="lg"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
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

        {/* Login Link */}
        <div className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            href={ROUTES.AUTH.LOGIN}
            className="font-semibold text-black hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
