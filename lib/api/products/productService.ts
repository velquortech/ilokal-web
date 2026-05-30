/**
 * Product Service Layer
 * Business logic for product and category management
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  Product,
  Category,
  ApiResponse,
  CreateProductRequest,
  UpdateProductRequest,
  ApplySaleRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/lib/types';
import * as productQuery from './productQuery';

// ===== Category Service =====

/**
 * Create a new category (admin only)
 */
export async function createCategory(
  input: CreateCategoryRequest,
): Promise<ApiResponse<Category>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if slug already exists
    const existing = await productQuery.getCategoryBySlug(input.slug);
    if (existing) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Category slug already exists',
        },
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: input.name,
        slug: input.slug,
        description: input.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[createCategory] Insert error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create category',
        },
      };
    }

    return {
      success: true,
      data: data as Category,
    };
  } catch (err) {
    console.error('[createCategory]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create category',
      },
    };
  }
}

/**
 * Update a category
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryRequest,
): Promise<ApiResponse<Category>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if category exists
    const existing = await productQuery.getCategoryById(id);
    if (!existing) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Category not found',
        },
      };
    }

    // Check if slug is being changed to existing one
    if (input.slug && input.slug !== existing.slug) {
      const duplicate = await productQuery.getCategoryBySlug(input.slug);
      if (duplicate) {
        return {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Category slug already exists',
          },
        };
      }
    }

    const { data, error } = await supabase
      .from('categories')
      .update({
        ...(input.name && { name: input.name }),
        ...(input.slug && { slug: input.slug }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[updateCategory] Update error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update category',
        },
      };
    }

    return {
      success: true,
      data: data as Category,
    };
  } catch (err) {
    console.error('[updateCategory]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update category',
      },
    };
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<ApiResponse<null>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if category exists
    const existing = await productQuery.getCategoryById(id);
    if (!existing) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Category not found',
        },
      };
    }

    // Check if category has products
    const products = await productQuery.getProductsByCategory(id);
    if (products && products.length > 0) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message:
            'Cannot delete category with products. Archive products first.',
        },
      };
    }

    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) {
      console.error('[deleteCategory] Delete error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete category',
        },
      };
    }

    return {
      success: true,
      data: null,
    };
  } catch (err) {
    console.error('[deleteCategory]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete category',
      },
    };
  }
}

// ===== Product Service =====

/**
 * Create a new product (business owner only)
 */
export async function createProduct(
  business_id: string,
  input: CreateProductRequest,
): Promise<ApiResponse<Product>> {
  try {
    if (input.price < 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Price cannot be negative',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    // Verify category exists if provided
    if (input.category_id) {
      const category = await productQuery.getCategoryById(input.category_id);
      if (!category) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
          },
        };
      }
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        business_id,
        category_id: input.category_id ?? null,
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        sale_price: input.sale_price ?? null,
        price_type: input.price_type ?? 'fixed',
        price_unit: input.price_unit ?? null,
        image_url: input.image_url ?? null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[createProduct] Insert error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create product',
        },
      };
    }

    return {
      success: true,
      data: data as Product,
    };
  } catch (err) {
    console.error('[createProduct]', err);
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
 * Update a product
 */
export async function updateProduct(
  id: string,
  business_id: string,
  input: UpdateProductRequest,
): Promise<ApiResponse<Product>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check product exists and belongs to business
    const result = await productQuery.getProductById(id);
    if ('error' in result) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      };
    }

    if (result.product.business_id !== business_id) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Unauthorized to update this product',
        },
      };
    }

    // Validate category if changing
    if (input.category_id) {
      const category = await productQuery.getCategoryById(input.category_id);
      if (!category) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Category not found',
          },
        };
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.sale_price !== undefined && { sale_price: input.sale_price }),
        ...(input.price_type !== undefined && { price_type: input.price_type }),
        ...(input.price_unit !== undefined && { price_unit: input.price_unit }),
        ...(input.category_id !== undefined && {
          category_id: input.category_id,
        }),
        ...(input.image_url !== undefined && { image_url: input.image_url }),
        ...(input.status !== undefined && { status: input.status }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[updateProduct] Update error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update product',
        },
      };
    }

    return {
      success: true,
      data: data as Product,
    };
  } catch (err) {
    console.error('[updateProduct]', err);
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
 * Apply a sale price to a product (business owner only)
 */
export async function applySale(
  id: string,
  business_id: string,
  input: ApplySaleRequest,
): Promise<ApiResponse<Product>> {
  try {
    const result = await productQuery.getProductById(id);
    if ('error' in result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      };
    }

    if (result.product.business_id !== business_id) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Unauthorized to update this product',
        },
      };
    }

    if (input.sale_price >= result.product.price) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Sale price must be less than the original price',
        },
      };
    }

    const updated = await productQuery.applySaleToProduct(id, input);
    if ('error' in updated) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: updated.error ?? 'Failed to apply sale',
        },
      };
    }

    return { success: true, data: updated.product as Product };
  } catch (err) {
    console.error('[applySale]', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to apply sale' },
    };
  }
}

/**
 * Remove an active sale from a product (business owner only)
 */
export async function removeSale(
  id: string,
  business_id: string,
): Promise<ApiResponse<Product>> {
  try {
    const result = await productQuery.getProductById(id);
    if ('error' in result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      };
    }

    if (result.product.business_id !== business_id) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Unauthorized to update this product',
        },
      };
    }

    const updated = await productQuery.removeSaleFromProduct(id);
    if ('error' in updated) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: updated.error ?? 'Failed to remove sale',
        },
      };
    }

    return { success: true, data: updated.product as Product };
  } catch (err) {
    console.error('[removeSale]', err);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove sale' },
    };
  }
}

/**
 * Delete/archive a product
 */
export async function deleteProduct(
  id: string,
  business_id: string,
): Promise<ApiResponse<null>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check product exists and belongs to business
    const result = await productQuery.getProductById(id);
    if ('error' in result) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
        },
      };
    }

    if (result.product.business_id !== business_id) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Unauthorized to delete this product',
        },
      };
    }

    // Soft-delete via archived_at; also mark unlisted so mobile won't serve it
    const { error } = await supabase
      .from('products')
      .update({
        status: 'disabled',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[deleteProduct] Update error:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete product',
        },
      };
    }

    return {
      success: true,
      data: null,
    };
  } catch (err) {
    console.error('[deleteProduct]', err);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete product',
      },
    };
  }
}
