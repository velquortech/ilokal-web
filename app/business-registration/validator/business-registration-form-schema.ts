// schemas.ts
import { z } from 'zod';

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
    geometry: z.string().min(1), // could be lat/lng JSON
  }),
});

const fileSchema = z.custom<File>((val) => val instanceof File);
const fileArraySchema = z.custom<File[]>(
  (val) => Array.isArray(val) && val.every((item) => item instanceof File),
);

export const step3Schema = z.object({
  shop_logo: fileSchema
    .refine((file) => file && file.size > 0, 'Logo is required')
    .optional(),
  shop_banner: fileSchema
    .refine((file) => file && file.size > 0, 'Banner is required')
    .optional(),
  interior_images: fileArraySchema
    .refine((files) => files && files.length >= 4, 'At least 4 images required')
    .optional(),
});

export const step4Schema = z.object({
  business_license: fileSchema
    .refine((file) => file && file.size > 0, 'Required')
    .optional(),
  tax_certificate: fileSchema
    .refine((file) => file && file.size > 0, 'Required')
    .optional(),
});

export const fullSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema);

export type BusinessProps = z.infer<typeof fullSchema>;
