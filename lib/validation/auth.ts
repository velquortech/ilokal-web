import { z } from 'zod';

/**
 * Centralized Authentication & User Validation Schemas
 * Used for both client-side and server-side validation
 * Follows security best practices: validate on both ends
 */

// ============================================================================
// LOGIN VALIDATION
// ============================================================================

export const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z
    .string({ message: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// SIGNUP VALIDATION (Client & User Registration)
// ============================================================================

export const signupSchema = z
  .object({
    email: z.email('Please enter a valid email address'),
    password: z
      .string({ message: 'Password is required' })
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must not exceed 100 characters'),
    confirmPassword: z.string({ message: 'Please confirm your password' }),
    name: z
      .string({ message: 'Name is required' })
      .min(1, 'Please enter your full name')
      .max(100, 'Name is too long'),
    role: z.enum(['admin', 'business_owner', 'user'], {
      message: 'Please select an account type',
    }),
    phone_number: z.string().optional().or(z.literal('')),
    avatar_url: z.string().optional().or(z.literal('')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Your passwords don't match",
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;

// ============================================================================
// SERVER-SIDE ADMIN CREATE USER
// Used when admin creates users via API endpoint
// ============================================================================

export const serverSignupSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'business_owner', 'user'], {
    message: 'Invalid role',
  }),
  phone_number: z.string().optional().or(z.literal('')),
  avatar_url: z.string().optional().or(z.literal('')),
});

export type ServerSignupInput = z.infer<typeof serverSignupSchema>;

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates signup data on server-side (API routes)
 * @param data - Raw signup data to validate
 * @returns Validation result with either parsed data or errors
 */
export function validateSignupData(data: unknown) {
  return serverSignupSchema.safeParse(data);
}

/**
 * Validates login data on server-side (API routes)
 * @param data - Raw login data to validate
 * @returns Validation result with either parsed data or errors
 */
export function validateLoginData(data: unknown) {
  return loginSchema.safeParse(data);
}

/**
 * Gets a formatted error message from validation result
 * @param errors - Zod errors object
 * @returns Formatted error message
 */
export function getValidationErrorMessage(
  errors: z.ZodError['issues'],
): string {
  if (errors.length === 0) return 'Validation failed';
  const firstError = errors[0];
  return `${firstError.path.join('.')}: ${firstError.message}`;
}
