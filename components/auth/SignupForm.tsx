'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, SignupInput } from '@/lib/validation/auth';
import { useAuthStore } from '@/services/stores/authStore';
import { signupAction, redirectByRole } from '@/app/(auth)/actions';
import { ROUTES } from '@/config/routeConfig';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { AlertCircle, ArrowRight, LucideIcon, Store, User } from 'lucide-react';
import { Separator } from '../ui/separator';

const UserTypeButton = (props: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    onClick={props.onClick}
    className="group bg-accent hover:bg-primary inline-flex w-full cursor-pointer items-center rounded-lg p-4 text-start hover:text-white"
  >
    <div className="inline-flex flex-1 space-x-4">
      <div className="bg-foreground/5 flex size-12 items-center justify-center rounded-lg">
        <props.icon className="size-7" />
      </div>
      <div className="flex flex-col space-x-2">
        <p className="font-semibold">{props.title}</p>
        <p className="text-foreground/50 text-sm group-hover:text-white">
          {props.description}
        </p>
      </div>
    </div>
    <ArrowRight className="ml-auto" />
  </button>
);

export default function SignupForm() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const setUser = useAuthStore((state) => state.setUser);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'user',
    },
  });

  const selectedRole = form.watch('role');

  const onSubmit = (data: SignupInput) => {
    startTransition(async () => {
      try {
        setApiError(null);
        setSuccessMessage(null);

        // Call Server Action for secure signup
        const response = await signupAction(data);

        // Update local auth state
        setUser(response.user);
        setSuccessMessage(response.message);

        // Redirect after brief delay to show success message
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await redirectByRole(response.user.role);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please check your information and try again.';
        setApiError(errorMessage);
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
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

        <Card className="bg-transparent">
          <CardHeader>
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>
              Please choose an account type and complete the form
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Name Field */}
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="text"
                      placeholder={
                        selectedRole === 'business_owner'
                          ? 'Business Owner Name'
                          : 'Your Name'
                      }
                      disabled={isPending}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Email Field */}
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Email Address</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="email"
                      placeholder="you@example.com"
                      disabled={isPending}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Password Field */}
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="password"
                      placeholder="••••••••"
                      disabled={isPending}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>Minimum 6 characters</FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Confirm Password Field */}
              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>
                      Confirm Password
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="password"
                      placeholder="••••••••"
                      disabled={isPending}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Separator />
              <div className="space-y-2">
                <UserTypeButton
                  title="Signup as Business Owner"
                  icon={Store}
                  description="Manage your shop, create offers, and grow your business"
                  onClick={() => {
                    form.setValue('role', 'business_owner');
                  }}
                />
                <UserTypeButton
                  title="Signup as Customer"
                  description="Discover local businesses, find deals, and enjoy rewards"
                  icon={User}
                  onClick={() => {
                    form.setValue('role', 'user');
                  }}
                />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Login Link */}
        <div className="text-muted-foreground text-center text-sm">
          Already have an account?{' '}
          <Link
            href={ROUTES.AUTH.LOGIN}
            className="hover:text-foreground underline underline-offset-2"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
