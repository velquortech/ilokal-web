import { z } from 'zod';

export const branchInfoSchema = z.object({
  name: z
    .string()
    .min(1, 'Branch name is required')
    .max(255, 'Name must be 255 characters or fewer'),
  phone: z.string().max(50).optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .optional()
    .or(z.literal('')),
  description: z.string().max(1000).optional(),
});

export const branchLocationSchema = z.object({
  address: z
    .string()
    .min(1, 'Address is required')
    .max(500, 'Address must be 500 characters or fewer'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const branchImagesSchema = z.object({
  cover_image: z.instanceof(File).optional(),
  gallery_images: z.array(z.instanceof(File)).optional(),
});

export const branchDocumentsSchema = z.object({
  business_permit: z.instanceof(File).optional(),
  other_document: z.instanceof(File).optional(),
});

export const branchCreateFullSchema = branchInfoSchema
  .merge(branchLocationSchema)
  .merge(branchImagesSchema)
  .merge(branchDocumentsSchema);

export type BranchCreateValues = z.infer<typeof branchCreateFullSchema>;
