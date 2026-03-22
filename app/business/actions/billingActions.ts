'use server';

/**
 * Billing management server actions
 * Mutations for payment methods, invoices, and billing-related operations
 */

import type {
  ApiResponse,
  SubscriptionPaymentMethod,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
} from '@/lib/types';
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
} from '@/lib/validation/subscriptions';
import { getCurrentUser } from '@/lib/api/getAdminUser';
import * as subscriptionQuery from '@/lib/api/subscriptions/subscriptionQuery';
import * as subscriptionService from '@/lib/api/subscriptions/subscriptionService';

/**
 * Add new payment method for business
 * POST /api/billing/payment-method
 */
export async function addPaymentMethodAction(
  input: CreatePaymentMethodRequest,
): Promise<ApiResponse<SubscriptionPaymentMethod>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Not authenticated',
        },
      };
    }

    // Validate input
    const validated = createPaymentMethodSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid payment method request',
          details: validated.error.issues,
        },
      };
    }

    // Get user's primary business
    const businessResult = await subscriptionQuery.getUserBusiness(user.id);
    if ('error' in businessResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No business found for user',
        },
      };
    }

    const businessId = businessResult.data.id;

    // Add payment method via service layer
    return await subscriptionService.addPaymentMethod(
      businessId,
      validated.data,
    );
  } catch (error) {
    console.error('[addPaymentMethodAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to add payment method',
      },
    };
  }
}

/**
 * Update existing payment method (set as default, update expiry)
 * PUT /api/billing/payment-method/:id
 */
export async function updatePaymentMethodAction(
  paymentMethodId: string,
  input: UpdatePaymentMethodRequest,
): Promise<ApiResponse<SubscriptionPaymentMethod>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Not authenticated',
        },
      };
    }

    // Validate input
    const validated = updatePaymentMethodSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update request',
          details: validated.error.issues,
        },
      };
    }

    // Get user's primary business
    const businessResult = await subscriptionQuery.getUserBusiness(user.id);
    if ('error' in businessResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No business found for user',
        },
      };
    }

    const businessId = businessResult.data.id;

    // Verify payment method belongs to user's business
    const pmResult =
      await subscriptionQuery.getPaymentMethodById(paymentMethodId);
    if ('error' in pmResult || pmResult.data.business_id !== businessId) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment method not found',
        },
      };
    }

    // If setting as default, call appropriate service function
    if (validated.data.is_default) {
      return await subscriptionService.setDefaultPaymentMethod(
        businessId,
        paymentMethodId,
      );
    }

    // For other updates (expiry dates in Stripe integration)
    // TODO: Implement other update operations based on validated.data

    return {
      success: true,
      data: pmResult.data,
    };
  } catch (error) {
    console.error('[updatePaymentMethodAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update payment method',
      },
    };
  }
}

/**
 * Remove payment method
 * DELETE /api/billing/payment-method/:id
 */
export async function removePaymentMethodAction(
  paymentMethodId: string,
): Promise<ApiResponse<{ message: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Not authenticated',
        },
      };
    }

    // Get user's primary business
    const businessResult = await subscriptionQuery.getUserBusiness(user.id);
    if ('error' in businessResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No business found for user',
        },
      };
    }

    const businessId = businessResult.data.id;

    // Verify payment method belongs to user's business
    const pmResult =
      await subscriptionQuery.getPaymentMethodById(paymentMethodId);
    if ('error' in pmResult || pmResult.data.business_id !== businessId) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment method not found',
        },
      };
    }

    // Remove payment method via service layer
    const result =
      await subscriptionService.removePaymentMethod(paymentMethodId);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: { message: 'Payment method removed successfully' },
    };
  } catch (error) {
    console.error('[removePaymentMethodAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove payment method',
      },
    };
  }
}

/**
 * Set payment method as default
 * PUT /api/billing/payment-method/:id (with is_default: true)
 * Convenience action for common operation
 */
export async function setDefaultPaymentMethodAction(
  paymentMethodId: string,
): Promise<ApiResponse<SubscriptionPaymentMethod>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Not authenticated',
        },
      };
    }

    // Get user's primary business
    const businessResult = await subscriptionQuery.getUserBusiness(user.id);
    if ('error' in businessResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No business found for user',
        },
      };
    }

    const businessId = businessResult.data.id;

    // Verify payment method belongs to user's business
    const pmResult =
      await subscriptionQuery.getPaymentMethodById(paymentMethodId);
    if ('error' in pmResult || pmResult.data.business_id !== businessId) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Payment method not found',
        },
      };
    }

    // Set as default via service layer
    return await subscriptionService.setDefaultPaymentMethod(
      businessId,
      paymentMethodId,
    );
  } catch (error) {
    console.error('[setDefaultPaymentMethodAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to set default payment method',
      },
    };
  }
}
