/**
 * Product Service Layer
 * Business logic for product and category management
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  Product,
  Category,
  ApiResponse,
  ApiError,
  CreateProductRequest,
  UpdateProductRequest,
  ApplySaleRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ProductStatus,
} from '@/lib/types';
import type { OfferingKind } from '@/lib/types/offering';
import * as productQuery from './productQuery';
import { sectionBelongsToBusiness } from '@/lib/api/sections/sectionQuery';
import { getBusinessTypeId } from '@/lib/api/offerings/offeringQuery';

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
 * A category an owner may attach: it exists, and it is in scope for this shop.
 *
 * Two axes, mirroring the picker exactly ("this vertical OR global, this kind
 * OR either"):
 *   - vertical: a pinned category must belong to the shop's vertical. A shop
 *     with NO vertical (never picked a category, or a failed read) accepts
 *     anything — the picker is unscoped then too, and fail-open matches it.
 *   - kind: a kind-scoped category must match the offering's kind. NULL means
 *     either, so it always passes.
 *
 * The client picker already applies both filters; this is the server re-check
 * so the same rule cannot be bypassed through the API route or a forged action
 * call — the section-ownership check below is the same shape.
 */
async function resolveCategoryInScope(
  category_id: string,
  business_id: string,
  kind: OfferingKind,
): Promise<{ category: Category } | { error: ApiError }> {
  const category = await productQuery.getCategoryById(category_id);
  if (!category) {
    return { error: { code: 'NOT_FOUND', message: 'Category not found' } };
  }

  const businessTypeId = await getBusinessTypeId(business_id);
  if (
    businessTypeId &&
    category.business_type_id &&
    category.business_type_id !== businessTypeId
  ) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'This category does not match your business type',
      },
    };
  }

  if (category.kind && category.kind !== kind) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'This category does not match the type of offering',
      },
    };
  }

  return { category };
}

/**
 * Create a new product (business owner only)
 */
export async function createProduct(
  business_id: string,
  input: CreateProductRequest,
): Promise<ApiResponse<Product>> {
  try {
    const isQuoteBased = input.price_type === 'on_request';

    if (input.price != null && input.price < 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Price cannot be negative',
        },
      };
    }

    // Mirrors the DB CHECK `price_type = 'on_request' OR price IS NOT NULL`,
    // so a missing price fails with a readable message instead of a raw 23514.
    if (!isQuoteBased && input.price == null) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Price is required unless the price type is "on request"',
        },
      };
    }

    if (isQuoteBased && input.price != null) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quote-based offerings cannot carry a price',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    // Verify the category exists AND is in scope for this shop (vertical +
    // kind) — existence alone let a salon attach "Meals & Rice Dishes" via
    // the API, which is the mismatch the picker's scoping exists to prevent.
    if (input.category_id) {
      const category = await resolveCategoryInScope(
        input.category_id,
        business_id,
        // The DB defaults omitted `kind` to 'product', so an untyped write
        // must be validated as the product it will become.
        input.kind ?? 'product',
      );
      if ('error' in category) {
        return { success: false, error: category.error };
      }
    }

    // A section id is only valid for THIS shop. The FK proves the row exists,
    // not that it is yours — without this an owner could attach another shop's
    // section and surface its naming on their own page.
    if (input.section_id) {
      const owned = await sectionBelongsToBusiness(
        input.section_id,
        business_id,
      );
      if (!owned) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Section not found' },
        };
      }
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        business_id,
        branch_id: input.branch_id ?? null,
        category_id: input.category_id ?? null,
        section_id: input.section_id ?? null,
        name: input.name,
        description: input.description ?? null,
        // NULL only survives the DB CHECK when price_type is 'on_request'.
        price: input.price ?? null,
        sale_price: input.sale_price ?? null,
        price_type: input.price_type ?? 'fixed',
        price_unit: input.price_unit ?? null,
        image_url: input.image_url ?? null,
        status: 'active',
        // Offering discriminator + service/rental attributes. Omitted keys
        // fall to the DB defaults ('product' / 'none' / 'at_business' / NULL),
        // so a retail write is byte-identical to before phase 3.
        ...(input.kind !== undefined && { kind: input.kind }),
        ...(input.booking_mode !== undefined && {
          booking_mode: input.booking_mode,
        }),
        ...(input.duration_minutes !== undefined && {
          duration_minutes: input.duration_minutes,
        }),
        ...(input.lead_time_minutes !== undefined && {
          lead_time_minutes: input.lead_time_minutes,
        }),
        ...(input.inventory_count !== undefined && {
          inventory_count: input.inventory_count,
        }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.deposit_amount !== undefined && {
          deposit_amount: input.deposit_amount,
        }),
        ...(input.min_duration_units !== undefined && {
          min_duration_units: input.min_duration_units,
        }),
        ...(input.max_duration_units !== undefined && {
          max_duration_units: input.max_duration_units,
        }),
        ...(input.service_location !== undefined && {
          service_location: input.service_location,
        }),
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

    // A soft-deleted product is not editable. `getProductById` does not filter
    // archived rows, so without this a status write could flip a deleted
    // offering back to `active` — the resurrection the bulk path's
    // `archived_at IS NULL` scope already prevents.
    if (result.product.archived_at) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      };
    }

    // Quote-pricing rules, resolved against the STORED price_type.
    //
    // `updateProductSchema` can only see the payload, so a partial update that
    // omits `price_type` skips its quote checks entirely — and the DB CHECK
    // only constrains the other direction (`price_type <> 'on_request'`
    // requires a price), so an existing on_request offering could be given a
    // price or a sale that the UI then refuses to display.
    const effectivePriceType = input.price_type ?? result.product.price_type;

    if (effectivePriceType === 'on_request') {
      if (input.price != null) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Quote-based offerings cannot carry a price',
          },
        };
      }
      if (input.sale_price != null) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Quote-based offerings cannot go on sale',
          },
        };
      }
    } else if (
      // Switching AWAY from on_request needs a figure to switch to.
      result.product.price_type === 'on_request' &&
      input.price == null &&
      result.product.price == null
    ) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Set a price when moving off "price on request"',
        },
      };
    }

    // Validate category ONLY when it changes. A row that already carries an
    // out-of-scope category (assigned before scoping, or via the old API
    // bypass) must stay editable — blocking an unrelated edit because of
    // pre-existing data would lock the owner out of their own catalogue.
    // Re-selecting the stored value is not a change; picking a different one
    // is checked against the same vertical + kind rule as create.
    if (
      input.category_id !== undefined &&
      input.category_id !== result.product.category_id
    ) {
      if (input.category_id) {
        const category = await resolveCategoryInScope(
          input.category_id,
          business_id,
          input.kind ?? result.product.kind,
        );
        if ('error' in category) {
          return { success: false, error: category.error };
        }
      }
    }

    // Same ownership rule as create. `null` is always allowed — that is the
    // owner moving the product back to Uncategorised.
    if (input.section_id) {
      const owned = await sectionBelongsToBusiness(
        input.section_id,
        business_id,
      );
      if (!owned) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Section not found' },
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
        ...(input.section_id !== undefined && {
          section_id: input.section_id,
        }),
        ...(input.image_url !== undefined && { image_url: input.image_url }),
        ...(input.status !== undefined && { status: input.status }),
        ...('branch_id' in input && { branch_id: input.branch_id ?? null }),
        ...(input.kind !== undefined && { kind: input.kind }),
        ...(input.booking_mode !== undefined && {
          booking_mode: input.booking_mode,
        }),
        ...(input.duration_minutes !== undefined && {
          duration_minutes: input.duration_minutes,
        }),
        ...(input.lead_time_minutes !== undefined && {
          lead_time_minutes: input.lead_time_minutes,
        }),
        ...(input.inventory_count !== undefined && {
          inventory_count: input.inventory_count,
        }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.deposit_amount !== undefined && {
          deposit_amount: input.deposit_amount,
        }),
        ...(input.min_duration_units !== undefined && {
          min_duration_units: input.min_duration_units,
        }),
        ...(input.max_duration_units !== undefined && {
          max_duration_units: input.max_duration_units,
        }),
        ...(input.service_location !== undefined && {
          service_location: input.service_location,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      // Defense in depth against the check above racing a concurrent delete.
      .is('archived_at', null)
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
 * Set the status of several products in one statement (business owner only).
 *
 * `business_id` is in the WHERE clause, not checked beforehand: it makes the
 * ownership scope part of the write itself, so an id belonging to another shop
 * simply doesn't match instead of needing a pre-flight read per row. Archived
 * rows are excluded — those are soft-deleted, and reviving one through a bulk
 * status change is not something the table offers.
 *
 * `is_available` is kept in sync by the `on_product_status_change` trigger, so
 * nothing here has to write it.
 */
export async function updateProductsStatus(
  ids: string[],
  business_id: string,
  status: ProductStatus,
): Promise<ApiResponse<{ updated: number }>> {
  try {
    const supabase = await createServerSupabaseClient();

    // `count` rather than `.select('id')` — the caller only needs how many rows
    // moved, and returning a row payload just to read `.length` is the pattern
    // the repo's count rule exists to prevent.
    const { count, error } = await supabase
      .from('products')
      .update(
        { status, updated_at: new Date().toISOString() },
        { count: 'exact' },
      )
      .in('id', ids)
      .eq('business_id', business_id)
      .is('archived_at', null);

    if (error) {
      console.error('[updateProductsStatus]', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update product status',
        },
      };
    }

    // Zero rows means every id was someone else's, archived, or gone — report
    // it rather than letting the UI toast a success it didn't get.
    if (!count) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No matching items were updated',
        },
      };
    }

    return { success: true, data: { updated: count } };
  } catch (err) {
    console.error('[updateProductsStatus]', err);
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

    // Quote-based offerings have no figure to discount — a percentage off an
    // unknown price is meaningless, and the row's price is NULL.
    if (
      result.product.price_type === 'on_request' ||
      result.product.price == null
    ) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Offerings priced on request cannot go on sale',
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
