import { z } from 'zod';

export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export const businessCategorySchema = z
  .object({
    id: z.string().uuid().optional(),
    type: z.enum(['predefined', 'custom']),
    name: z.string().min(1, 'Category is required'),
    description: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === 'custom') {
      if (!val.description || val.description.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Description is required',
          path: ['description'],
        });
      }
    }
  });

export const step1Schema = z.object({
  business_category: businessCategorySchema,
});

export const step2Schema = z.object({
  shop_name: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  location: z.object({
    province: z.string().min(1),
    city: z.string().min(1),
    barangay: z.string().min(1),
    street_address: z.string().min(1),
    zip_code: z.string().min(1),
    latitude: z
      .number({ error: 'Must be a number' })
      .min(-90, 'Invalid latitude')
      .max(90, 'Invalid latitude')
      .optional(),
    longitude: z
      .number({ error: 'Must be a number' })
      .min(-180, 'Invalid longitude')
      .max(180, 'Invalid longitude')
      .optional(),
    geometry: z.string().min(1, 'Set your location coordinates to continue'),
  }),
});

const fileSchema = z.custom<File>((val) => val instanceof File);
const fileArraySchema = z.custom<File[]>(
  (val) => Array.isArray(val) && val.every((item) => item instanceof File),
);

export const step3Schema = z.object({
  shop_logo: fileSchema
    .refine((file) => file && file.size > 0, 'Logo is required')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'Image must be 2MB or less')
    .optional(),
  shop_banner: fileSchema
    .refine((file) => file && file.size > 0, 'Banner is required')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'Image must be 2MB or less')
    .optional(),
  interior_images: fileArraySchema
    .refine((files) => files && files.length >= 4, 'At least 4 images required')
    .refine(
      (files) => files.every((f) => f.size <= MAX_FILE_SIZE),
      'Each image must be 2MB or less',
    )
    .optional(),
});

export const step4Schema = z.object({
  business_license: fileSchema
    .refine((file) => file && file.size > 0, 'Required')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'File must be 2MB or less')
    .optional(),
  tax_certificate: fileSchema
    .refine((file) => file && file.size > 0, 'Required')
    .refine((file) => file.size <= MAX_FILE_SIZE, 'File must be 2MB or less')
    .optional(),
});

export const fullSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema);

export type BusinessProps = z.infer<typeof fullSchema>;
