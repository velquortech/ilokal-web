'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, SignupInput } from '@/lib/validation/auth';
import { useAuthStore } from '@/lib/stores/authStore';
import authService from '@/lib/api/authService';
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

export default function SignupForm() {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [step, setStep] = useState<'role' | 'details'>('role');
  const setUser = useAuthStore((state) => state.setUser);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    control,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'user',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: SignupInput) => {
    try {
      setApiError(null);
      setSuccessMessage(null);
      setIsLoading(true);

      const response = await authService.signup(data);
      setUser(response.user);
      setSuccessMessage(response.message);

      // Redirect after a short delay to show success message
      setTimeout(() => {
        router.push('/home');
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to sign up. Please try again.';
      setApiError(errorMessage);
      setIsLoading(false);
    }
  };

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

        {/* Error Alert */}
        {apiError && (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <p>{successMessage}</p>
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
                            field.value === 'user'
                              ? 'rgb(0, 0, 0)'
                              : 'rgb(226, 232, 240)',
                          backgroundColor:
                            field.value === 'user'
                              ? 'rgb(245, 245, 245)'
                              : undefined,
                        }}
                      >
                        <RadioGroupItem
                          value="user"
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
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                  <p className="text-xs text-slate-500">Minimum 6 characters</p>
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-black text-white hover:bg-slate-900"
                    size="lg"
                  >
                    {isSubmitting ? (
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
            href="/auth/login"
            className="font-semibold text-black hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
