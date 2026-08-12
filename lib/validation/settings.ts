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

/**
 * `z.url()` alone is NOT enough: it is backed by `new URL()`, which accepts
 * `javascript:alert(1)` as a valid URL. These columns are rendered as links on
 * the public shop page, so an unrestricted scheme is stored XSS. Restrict to
 * http(s) here, and keep the render-side `safeExternalUrl` guard for rows
 * written before this rule (and for admin edits that bypass Zod).
 */
const urlOrEmpty = z
  .string()
  .url('Must be a valid URL')
  .refine(
    (value) => {
      try {
        const { protocol } = new URL(value);
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Link must start with http:// or https://' },
  )
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
  // `.optional()` here, NOT inside `urlOrEmpty`: that chain's transform
  // (`v => v ?? null`) would otherwise swallow the optionality and make the
  // key REQUIRED in the inferred input type — a partial settings update like
  // `{ allow_reviews: true }` would fail typecheck (and `safeParse`).
  contact_website: urlOrEmpty.optional(),
  contact_phone_public: z.string().max(20).optional().nullable(),
  allow_reviews: z.boolean().optional(),
  coupon_default_expiry_days: z.number().int().min(1).max(365).optional(),
});

export type UpdateBusinessSettingsInput = z.infer<
  typeof updateBusinessSettingsSchema
>;

export const deactivateBusinessSchema = z.object({
  confirmation: z.literal('DEACTIVATE', {
    error: 'Type DEACTIVATE to confirm',
  }),
});

export type DeactivateBusinessInput = z.infer<typeof deactivateBusinessSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.literal('DELETE', {
    error: 'Type DELETE to confirm',
  }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
