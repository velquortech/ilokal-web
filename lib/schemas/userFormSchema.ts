import { z } from 'zod';

export const userFormSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    verification_status: z
      .enum(['pending', 'verified', 'suspended', 'rejected'])
      .optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

export type UserFormData = z.infer<typeof userFormSchema>;
