import { z } from 'zod';

/**
 * Signup validation schema for API routes
 * Used for server-side validation of signup requests
 */
export const signupValidationSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'business_owner', 'user'], {
    message: 'Invalid role',
  }),
});

export type SignupValidationInput = z.infer<typeof signupValidationSchema>;

/**
 * Validates signup data and returns typed result
 * @param data - Raw signup data to validate
 * @returns Validation result with either parsed data or errors
 */
export function validateSignupData(data: unknown) {
  return signupValidationSchema.safeParse(data);
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
