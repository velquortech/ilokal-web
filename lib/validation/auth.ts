import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters'),
});

export const signupSchema = z
  .object({
    email: z.email('Please enter a valid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must not exceed 100 characters'),
    confirmPassword: z.string(),
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    role: z.enum(['admin', 'business_owner', 'user'], {
      message: 'Please select a role',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
