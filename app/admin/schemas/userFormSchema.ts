import { z } from 'zod';

export const userFormSchema = z
  .object({
    email: z
      .string()
      .email('Invalid email address')
      .max(254, 'Email must be less than 254 characters'),
    full_name: z
      .string()
      .min(1, 'Full name is required')
      .max(255, 'Full name must be less than 255 characters')
      .refine(
        (val) => /^[a-zA-Z\s'-]+$/.test(val),
        'Full name can only contain letters, spaces, hyphens, and apostrophes',
      ),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
    role: z.enum(['admin', 'business_owner', 'app_user'] as const),
    status: z.enum(['active', 'inactive', 'suspended'] as const).optional(),
    phone_number: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (val) => !val || /^\+[1-9]\d{1,14}(\s\d+)?$/.test(val),
        'Phone number must be in international format with country code (e.g., +639324234324)',
      ),
    avatar_url: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (val) => !val || val.startsWith('http'),
        'Avatar URL must be a valid URL',
      ),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

export const adminEditSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must be less than 255 characters')
    .refine(
      (val) => /^[a-zA-Z\s'-]+$/.test(val),
      'Full name can only contain letters, spaces, hyphens, and apostrophes',
    ),
  phone_number: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || /^\+[1-9]\d{1,14}(\s\d+)?$/.test(val),
      'Phone number must be in international format with country code (e.g., +639324234324)',
    ),
  email: z
    .string()
    .email('Invalid email')
    .max(254, 'Email must be less than 254 characters'),
  password: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || val.length >= 8,
      'Password must be at least 8 characters if provided',
    ),
  avatar_url: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || val.startsWith('http'),
      'Avatar URL must be a valid URL',
    ),
});

export type UserFormData = z.infer<typeof userFormSchema>;
export type AdminEditFormData = z.infer<typeof adminEditSchema>;

/**
 * Validation for search/filter queries
 */
export const searchQuerySchema = z
  .string()
  .max(100, 'Search query must be less than 100 characters');

export type SearchQuery = z.infer<typeof searchQuerySchema>;
