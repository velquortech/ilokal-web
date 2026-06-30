'use server';

import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';
import type {
  ApiResponse,
  ApiError,
  Product,
  ProductStatus,
  CreateProductRequest,
  UpdateProductRequest,
  ApplySaleRequest,
  Category,
  ProductFilters,
  PaginatedProductsResponse,
} from '@/lib/types';

import {
  createProductSchema,
  updateProductSchema,
  applySaleSchema,
} from '@/lib/validation/products';
import * as productQuery from '@/lib/api/products/productQuery';
import * as productService from '@/lib/api/products/productService';
import {
  uploadWebP,
  ImageProcessingError,
  toWebPFilename,
  IMAGE_PRESETS,
} from '@/lib/api/helpers/image';

// ===== Business Owner Product Actions =====

/**
 * Create a new product
 */
export async function createProductAction(
  input: CreateProductRequest,
): Promise<ApiResponse<Product>> {
  try {
    // Validate input
    const validation = createProductSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0];
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError || 'Invalid product data',
        },
      };
    }

    // Verify business owner and get business id
    const verify = await verifyBusinessOwner();
    if (!verify.authorized) {
      return { success: false, error: verify.error as ApiError };
    }

    return await productService.createProduct(
      verify.business!.id,
      validation.data,
    );
  } catch (error) {
    console.error('[createProductAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create product',
      },
    };
  }
}

/**
 * Update an existing product
 */
export async function updateProductAction(
  id: string,
  input: UpdateProductRequest,
): Promise<ApiResponse<Product>> {
  try {
    // Validate input
    const validation = updateProductSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0];
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError || 'Invalid product data',
        },
      };
    }

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    return await productService.updateProduct(
      id,
      verify.business!.id,
      validation.data,
    );
  } catch (error) {
    console.error('[updateProductAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update product',
      },
    };
  }
}

/**
 * Delete/archive a product
 */
export async function deleteProductAction(
  id: string,
): Promise<ApiResponse<null>> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    return await productService.deleteProduct(id, verify.business!.id);
  } catch (error) {
    console.error('[deleteProductAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete product',
      },
    };
  }
}

/**
 * Update only the status of a product
 */
export async function updateProductStatusAction(
  id: string,
  status: ProductStatus,
): Promise<ApiResponse<Product>> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    return await productService.updateProduct(id, verify.business!.id, {
      status,
    });
  } catch (error) {
    console.error('[updateProductStatusAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update product status',
      },
    };
  }
}

/**
 * Get products by business
 */
export async function getBusinessProductsAction(): Promise<
  ApiResponse<Product[]>
> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const result = await productQuery.getProductsByBusinessId(
      verify.business!.id,
    );
    if ('error' in result) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: result.error as string,
        },
      };
    }

    return {
      success: true,
      data: result.products,
    };
  } catch (error) {
    console.error('[getBusinessProductsAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch products',
      },
    };
  }
}

/**
 * Apply a sale price to a product
 */
export async function applySaleAction(
  id: string,
  input: ApplySaleRequest,
): Promise<ApiResponse<Product>> {
  try {
    const validation = applySaleSchema.safeParse(input);
    if (!validation.success) {
      const firstError = Object.values(
        validation.error.flatten().fieldErrors,
      ).flat()[0];
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError || 'Invalid sale data',
        },
      };
    }

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    return await productService.applySale(
      id,
      verify.business!.id,
      validation.data,
    );
  } catch (error) {
    console.error('[applySaleAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to apply sale' },
    };
  }
}

/**
 * Remove an active sale from a product
 */
export async function removeSaleAction(
  id: string,
): Promise<ApiResponse<Product>> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    return await productService.removeSale(id, verify.business!.id);
  } catch (error) {
    console.error('[removeSaleAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove sale' },
    };
  }
}

/**
 * Get paginated products for the authenticated business owner
 */
export async function getBusinessProductsPaginatedAction(
  filters: Omit<ProductFilters, 'business_id'>,
): Promise<ApiResponse<PaginatedProductsResponse>> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const result = await productQuery.getProductsPaginated({
      ...filters,
      business_id: verify.business!.id,
    });

    if ('error' in result) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: result.error },
      };
    }

    return { success: true, data: result as PaginatedProductsResponse };
  } catch (error) {
    console.error('[getBusinessProductsPaginatedAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products' },
    };
  }
}

/**
 * Get product status counts for the authenticated business owner
 */
export async function getBusinessProductStatsAction(): Promise<
  ApiResponse<{
    total: number;
    active: number;
    inactive: number;
    archived: number;
  }>
> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };

    const stats = await productQuery.getProductStatsByBusiness(
      verify.business!.id,
    );
    return { success: true, data: stats };
  } catch (error) {
    console.error('[getBusinessProductStatsAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' },
    };
  }
}

/**
 * Get all categories for product creation
 */
export async function getCategoriesAction(): Promise<ApiResponse<Category[]>> {
  try {
    const result = await productQuery.getCategoriesPaginated({
      page: 1,
      per_page: 200, // Get all categories
      sort_by: 'name_asc',
    });

    return {
      success: true,
      data: result.categories,
    };
  } catch (error) {
    console.error('[getCategoriesAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch categories',
      },
    };
  }
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function uploadProductImageAction(
  formData: FormData,
): Promise<ApiResponse<{ url: string }>> {
  try {
    const verify = await verifyBusinessOwner();
    if (!verify.authorized) {
      return { success: false, error: verify.error as ApiError };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' },
      };
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File must be less than 2 MB',
        },
      };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Only JPEG, PNG, GIF, or WebP images are allowed',
        },
      };
    }

    const supabase = await createServerSupabaseClient();
    const businessId = verify.business!.id;
    const fileName = `${Date.now()}-${toWebPFilename(file.name.replace(/\s+/g, '-'))}`;
    const filePath = `${businessId}/${fileName}`;

    try {
      await uploadWebP(supabase, 'product-images', filePath, file, {
        maxDimension: IMAGE_PRESETS.product,
      });
    } catch (err) {
      if (err instanceof ImageProcessingError) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.message },
        };
      }
      // Storage error — log server-side, return a generic message (don't leak
      // the raw driver error to the owner-facing client).
      console.error('[uploadProductImageAction] Upload error:', err);
      return {
        success: false,
        error: { code: 'UPLOAD_ERROR', message: 'Failed to upload image' },
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('product-images').getPublicUrl(filePath);

    return { success: true, data: { url: publicUrl } };
  } catch (error) {
    console.error('[uploadProductImageAction]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to upload image' },
    };
  }
}
