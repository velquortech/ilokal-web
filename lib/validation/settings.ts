import { z } from 'zod';

function validatePasswordStrength(password: string): boolean {
  return (
    /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)
  );
}

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must not exceed 100 characters')
      .refine(
        validatePasswordStrength,
        'Password must contain uppercase, lowercase, and numbers',
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  newEmail: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required to confirm email change'),
});

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

export const updateNotificationPreferencesSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  digest: z.enum(['daily', 'weekly', 'none']),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;

const urlOrEmpty = z
  .string()
  .url('Must be a valid URL')
  .optional()
  .or(z.literal(''))
  .or(z.null())
  .transform((v) => v ?? null);

const operatingHoursDaySchema = z.object({
  open: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm')
    .optional()
    .or(z.literal('')),
  close: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm')
    .optional()
    .or(z.literal('')),
  closed: z.boolean(),
});

const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export const updateBusinessSettingsSchema = z.object({
  operating_hours: z
    .object(
      Object.fromEntries(
        dayKeys.map((d) => [d, operatingHoursDaySchema]),
      ) as Record<(typeof dayKeys)[number], typeof operatingHoursDaySchema>,
    )
    .optional()
    .nullable(),
  social_links: z
    .object({
      facebook: urlOrEmpty,
      instagram: urlOrEmpty,
      tiktok: urlOrEmpty,
      website: urlOrEmpty,
    })
    .optional()
    .nullable(),
  contact_website: urlOrEmpty,
  contact_phone_public: z.string().max(20).optional().nullable(),
  allow_reviews: z.boolean().optional(),
  coupon_default_expiry_days: z.number().int().min(1).max(365).optional(),
});

export type UpdateBusinessSettingsInput = z.infer<
  typeof updateBusinessSettingsSchema
>;

export const deactivateBusinessSchema = z.object({
  confirmation: z.literal('DEACTIVATE', {
    errorMap: () => ({ message: 'Type DEACTIVATE to confirm' }),
  }),
});

export type DeactivateBusinessInput = z.infer<typeof deactivateBusinessSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'Type DELETE to confirm' }),
  }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
