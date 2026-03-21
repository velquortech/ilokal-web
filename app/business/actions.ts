/**
 * Business Owner Product & Category Server Actions
 * Used for creating, updating, and deleting products
 */

'use server';

import { createServerSupabaseClient } from '@/config/server';
import type {
  ApiResponse,
  Product,
  CreateProductRequest,
  UpdateProductRequest,
  Category,
  Coupon,
  CreateCouponRequest,
  UpdateCouponRequest,
  CouponDetailResponse,
  FeaturedDeal,
  CreateFeaturedDealRequest,
  UpdateFeaturedDealRequest,
} from '@/lib/types';
import {
  createProductSchema,
  updateProductSchema,
} from '@/lib/validation/products';
import {
  createCouponSchema,
  updateCouponSchema,
  createFeaturedDealSchema,
  updateFeaturedDealSchema,
} from '@/lib/validation/coupons';
import * as productService from '@/lib/api/products/productService';
import * as productQuery from '@/lib/api/products/productQuery';
import * as couponService from '@/lib/api/coupons/couponService';

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

    // Get current user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Get user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Business not found',
        },
      };
    }

    return await productService.createProduct(business.id, validation.data);
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

    // Get current user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Get user's business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Business not found',
        },
      };
    }

    return await productService.updateProduct(id, business.id, validation.data);
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
    // Get current user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Get user's business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Business not found',
        },
      };
    }

    return await productService.deleteProduct(id, business.id);
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
    // Get current user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Get user's business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Business not found',
        },
      };
    }

    const result = await productQuery.getProductsByBusinessId(business.id);
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

// ===== Branch Management Actions =====

import type {
  Branch,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '@/lib/types';
import {
  createBranchSchema,
  updateBranchSchema,
} from '@/lib/validation/branches';
import * as branchService from '@/lib/api/branches/branchService';

/**
 * Create a new branch for the user's business
 */
export async function createBranchAction(
  input: CreateBranchRequest,
): Promise<ApiResponse<Branch>> {
  try {
    // Validate input
    const validation = createBranchSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.name?.[0] || 'Invalid branch data',
        },
      };
    }

    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Get user's business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have a business',
        },
      };
    }

    return await branchService.createBranch(business.id, validation.data);
  } catch (error) {
    console.error('[createBranchAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create branch',
      },
    };
  }
}

/**
 * Update a branch
 */
export async function updateBranchAction(
  id: string,
  input: UpdateBranchRequest,
): Promise<ApiResponse<Branch>> {
  try {
    // Validate input
    const validation = updateBranchSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.name?.[0] || 'Invalid branch data',
        },
      };
    }

    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Verify user owns the branch's business
    const { data: branch } = await supabase
      .from('branches')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!branch) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Branch not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', branch.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to update this branch',
        },
      };
    }

    return await branchService.updateBranch(id, validation.data);
  } catch (error) {
    console.error('[updateBranchAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update branch',
      },
    };
  }
}

/**
 * Delete a branch
 */
export async function deleteBranchAction(
  id: string,
): Promise<ApiResponse<null>> {
  try {
    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Verify user owns the branch's business
    const { data: branch } = await supabase
      .from('branches')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!branch) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Branch not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', branch.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to delete this branch',
        },
      };
    }

    return await branchService.deleteBranch(id);
  } catch (error) {
    console.error('[deleteBranchAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete branch',
      },
    };
  }
}

// ===== Coupon Management Actions =====

/**
 * Create a new coupon for the business
 */
export async function createCouponAction(
  input: CreateCouponRequest,
): Promise<ApiResponse<Coupon>> {
  try {
    // Validate input
    const validation = createCouponSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.code?.[0] || 'Invalid coupon data',
        },
      };
    }

    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have a business',
        },
      };
    }

    return await couponService.createCoupon(business.id, validation.data);
  } catch (error) {
    console.error('[createCouponAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create coupon',
      },
    };
  }
}

/**
 * Update a coupon
 */
export async function updateCouponAction(
  id: string,
  input: UpdateCouponRequest,
): Promise<ApiResponse<Coupon>> {
  try {
    // Validate input
    const validation = updateCouponSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.code?.[0] || 'Invalid coupon data',
        },
      };
    }

    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Verify user owns the coupon's business
    const { data: coupon } = await supabase
      .from('coupons')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!coupon) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Coupon not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', coupon.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to update this coupon',
        },
      };
    }

    return await couponService.updateCoupon(id, validation.data);
  } catch (error) {
    console.error('[updateCouponAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update coupon',
      },
    };
  }
}

/**
 * Delete a coupon
 */
export async function deleteCouponAction(
  id: string,
): Promise<ApiResponse<null>> {
  try {
    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Verify user owns the coupon's business
    const { data: coupon } = await supabase
      .from('coupons')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!coupon) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Coupon not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', coupon.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to delete this coupon',
        },
      };
    }

    return await couponService.deleteCoupon(id);
  } catch (error) {
    console.error('[deleteCouponAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete coupon',
      },
    };
  }
}

/**
 * Redeem a coupon (public: any user)
 */
export async function redeemCouponAction(
  couponCode: string,
): Promise<ApiResponse<CouponDetailResponse>> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    return await couponService.redeemCoupon(couponCode, user.id);
  } catch (error) {
    console.error('[redeemCouponAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to redeem coupon',
      },
    };
  }
}

/**
 * Create a featured deal for the business
 */
export async function createFeaturedDealAction(
  input: CreateFeaturedDealRequest,
): Promise<ApiResponse<FeaturedDeal>> {
  try {
    // Validate input
    const validation = createFeaturedDealSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.coupon_id?.[0] || 'Invalid featured deal data',
        },
      };
    }

    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have a business',
        },
      };
    }

    return await couponService.createFeaturedDeal(business.id, validation.data);
  } catch (error) {
    console.error('[createFeaturedDealAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create featured deal',
      },
    };
  }
}

/**
 * Update a featured deal
 */
export async function updateFeaturedDealAction(
  id: string,
  input: UpdateFeaturedDealRequest,
): Promise<ApiResponse<FeaturedDeal>> {
  try {
    // Validate input
    const validation = updateFeaturedDealSchema.safeParse(input);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: fieldErrors.coupon_id?.[0] || 'Invalid featured deal data',
        },
      };
    }

    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Verify user owns the deal's business
    const { data: deal } = await supabase
      .from('featured_deals')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!deal) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Featured deal not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', deal.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to update this featured deal',
        },
      };
    }

    return await couponService.updateFeaturedDeal(id, validation.data);
  } catch (error) {
    console.error('[updateFeaturedDealAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update featured deal',
      },
    };
  }
}

/**
 * Delete a featured deal
 */
export async function deleteFeaturedDealAction(
  id: string,
): Promise<ApiResponse<null>> {
  try {
    // Get current user's business
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'You must be logged in',
        },
      };
    }

    // Verify user owns the deal's business
    const { data: deal } = await supabase
      .from('featured_deals')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!deal) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Featured deal not found',
        },
      };
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', deal.business_id)
      .eq('owner_id', user.id)
      .single();

    if (!business) {
      return {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission to delete this featured deal',
        },
      };
    }

    return await couponService.deleteFeaturedDeal(id);
  } catch (error) {
    console.error('[deleteFeaturedDealAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete featured deal',
      },
    };
  }
}
