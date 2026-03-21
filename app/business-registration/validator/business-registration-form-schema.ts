// schemas.ts
import { z } from 'zod';

export const businessCategorySchema = z
  .object({
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
    geometry: z.string().min(1), // could be lat/lng JSON
  }),
});

export const step3Schema = z.object({
  shop_logo: z.any().refine((file) => file instanceof File, 'Logo is required'),
  interior_images: z
    .any()
    .refine(
      (files) => files && files.length >= 4,
      'At least 4 images required',
    ),
});

export const step4Schema = z.object({
  business_license: z.any().refine((file) => file instanceof File, 'Required'),
  tax_certificate: z.any().refine((file) => file instanceof File, 'Required'),
});

export const fullSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema);

export type FormData = z.infer<typeof fullSchema>;
