import { z } from 'zod';

// Shop Registration Schemas (for multi-step form validation)
export const basicInfoSchema = z.object({
  shopName: z
    .string()
    .min(1, 'Shop name is required')
    .max(200, 'Shop name must be less than 200 characters'),
  category: z.string().min(1, 'Business category is required'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
});

export const brandingSchema = z.object({
  logo: z.instanceof(File, { message: 'Logo is required' }),
});

export const interiorImagesSchema = z.object({
  interiorImages: z
    .array(z.instanceof(File))
    .min(3, 'At least 3 interior images are required')
    .max(10, 'Maximum 10 interior images allowed'),
});

export const locationSchema = z.object({
  regionCode: z.string().min(1, 'Region is required'),
  provinceCode: z.string().min(1, 'Province is required'),
  cityCode: z.string().min(1, 'City/Municipality is required'),
  barangayCode: z.string().min(1, 'Barangay is required'),
  streetAddress: z.string().min(1, 'Street address is required'),
  zipCode: z
    .string()
    .min(1, 'ZIP code is required')
    .regex(/^\d{4}$/, 'ZIP code must be 4 digits'),
});

export const legalDocumentsSchema = z.object({
  businessLicense: z.instanceof(File, {
    message: 'Business license is required',
  }),
  taxId: z.instanceof(File, { message: 'Tax ID document is required' }),
});

// Step validation helper that returns the error message or null
export const validateStepWithZod = (
  step: number,
  data: {
    shopName?: string;
    category?: string;
    description?: string;
    logo?: File | null;
    interiorImages?: File[];
    regionCode?: string;
    provinceCode?: string;
    cityCode?: string;
    barangayCode?: string;
    streetAddress?: string;
    zipCode?: string;
    businessLicense?: File | null;
    taxId?: File | null;
  },
): string | null => {
  try {
    switch (step) {
      case 1:
        basicInfoSchema.parse({
          shopName: data.shopName,
          category: data.category,
          description: data.description,
        });
        break;
      case 2:
        brandingSchema.parse({
          logo: data.logo,
        });
        break;
      case 3:
        interiorImagesSchema.parse({
          interiorImages: data.interiorImages,
        });
        break;
      case 4:
        locationSchema.parse({
          regionCode: data.regionCode,
          provinceCode: data.provinceCode,
          cityCode: data.cityCode,
          barangayCode: data.barangayCode,
          streetAddress: data.streetAddress,
          zipCode: data.zipCode,
        });
        break;
      case 5:
        legalDocumentsSchema.parse({
          businessLicense: data.businessLicense,
          taxId: data.taxId,
        });
        break;
    }
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || 'Validation failed';
    }
    return 'Validation failed';
  }
};

// Validation for form inputs (accepts File objects)
export const businessRegistrationFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Business name is required')
    .max(200, 'Name is too long'),
  description: z.string().optional(),
  logo: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024,
      'Logo must be less than 5MB',
    )
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Logo must be an image file (JPEG, PNG, or WebP)',
    )
    .optional(),
  interior_images: z
    .array(
      z
        .instanceof(File)
        .refine(
          (file) => file.size <= 5 * 1024 * 1024,
          'Each image must be less than 5MB',
        )
        .refine(
          (file) =>
            ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
          'Files must be image files (JPEG, PNG, or WebP)',
        ),
    )
    .default([]),
  verification_docs: z
    .array(
      z
        .instanceof(File)
        .refine(
          (file) => file.size <= 10 * 1024 * 1024,
          'Each document must be less than 10MB',
        )
        .refine(
          (file) =>
            ['application/pdf', 'application/msword', 'text/plain'].includes(
              file.type,
            ) || file.name.endsWith('.docx'),
          'Documents must be PDF, DOC, DOCX, or TXT files',
        ),
    )
    .default([]),
});

// Validation for API submission (accepts URLs)
export const businessRegistrationSchema = z.object({
  name: z
    .string()
    .min(1, 'Business name is required')
    .max(200, 'Name is too long'),
  description: z.string().optional(),
  logo_url: z.string().url('Must be a valid URL').optional(),
  interior_images: z.array(z.string().url('Must be a valid URL')).default([]),
  verification_docs_url: z
    .array(z.string().url('Must be a valid URL'))
    .default([]),
});

export type BusinessRegistrationFormInput = z.infer<
  typeof businessRegistrationFormSchema
>;
export type BusinessRegistrationInput = z.infer<
  typeof businessRegistrationSchema
>;

// Product validation schema (for optional products in registration)
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  price: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Valid price is required',
    }),
  image: z.instanceof(File).optional().nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;

// Product form schema for registration
export const registrationProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string(),
  price: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Valid price is required',
    }),
  image: z.instanceof(File).nullable(),
  imagePreview: z.string(),
});

// Combined shop registration schema for react-hook-form
export const shopRegistrationSchema = z.object({
  // Basic Info
  shopName: z
    .string()
    .min(1, 'Shop name is required')
    .max(200, 'Shop name must be less than 200 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  category: z.string().min(1, 'Business category is required'),

  // Branding
  logo: z.instanceof(File, { message: 'Logo is required' }),
  logoPreview: z.string(),

  // Interior Images
  interiorImages: z
    .array(z.instanceof(File))
    .min(3, 'At least 3 interior images are required')
    .max(10, 'Maximum 10 interior images allowed'),
  interiorPreviews: z.array(z.string()),

  // Location - Philippines Geography
  regionCode: z.string().min(1, 'Region is required'),
  regionName: z.string(),
  provinceCode: z.string().min(1, 'Province is required'),
  provinceName: z.string(),
  cityCode: z.string().min(1, 'City/Municipality is required'),
  cityName: z.string(),
  barangayCode: z.string().min(1, 'Barangay is required'),
  barangayName: z.string(),
  streetAddress: z.string().min(1, 'Street address is required'),
  zipCode: z
    .string()
    .min(1, 'ZIP code is required')
    .regex(/^\d{4}$/, 'ZIP code must be 4 digits'),

  // Legal Documents
  businessLicense: z.instanceof(File, {
    message: 'Business license is required',
  }),
  taxId: z.instanceof(File, { message: 'Tax ID document is required' }),

  // Products
  products: z.array(registrationProductSchema),
});

export type ShopRegistrationFormData = z.infer<typeof shopRegistrationSchema>;

// Step validation schema map for partial validation
export const stepValidationSchemas = {
  1: shopRegistrationSchema.pick({
    shopName: true,
    description: true,
    category: true,
  }),
  2: shopRegistrationSchema.pick({
    logo: true,
  }),
  3: shopRegistrationSchema.pick({
    interiorImages: true,
  }),
  4: shopRegistrationSchema.pick({
    regionCode: true,
    provinceCode: true,
    cityCode: true,
    barangayCode: true,
    streetAddress: true,
    zipCode: true,
  }),
  5: shopRegistrationSchema.pick({
    businessLicense: true,
    taxId: true,
  }),
  6: shopRegistrationSchema.pick({
    products: true,
  }),
} as const;
