'use server';

import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import type {
  ApiResponse,
  ApiError,
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  Category,
} from '@/lib/types';

import {
  createProductSchema,
  updateProductSchema,
} from '@/lib/validation/products';
import * as productService from '@/lib/api/products/productService';
import * as productQuery from '@/lib/api/products/productQuery';

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
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.name?.[0] || 'Invalid product data',
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
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.name?.[0] || 'Invalid product data',
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
