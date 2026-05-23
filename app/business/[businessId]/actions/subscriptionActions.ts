'use server';

/**
 * Subscription management server actions
 * Mutations for user subscriptions (subscribe, upgrade, downgrade, cancel)
 */

import type {
  ApiResponse,
  ApiError,
  SubscriptionResponse,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  UpgradeSubscriptionRequest,
  DowngradeSubscriptionRequest,
  CancelSubscriptionRequest,
} from '@/lib/types';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  upgradeSubscriptionSchema,
  downgradeSubscriptionSchema,
  cancelSubscriptionSchema,
} from '@/lib/validation/subscriptions';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as subscriptionQuery from '@/lib/api/subscriptions/subscriptionQuery';
import subscriptionService from '@/lib/services/subscriptionService';

/**
 * Subscribe business to subscription plan
 * POST /api/subscriptions/subscribe
 */
export async function subscribeToplanAction(
  input: CreateSubscriptionRequest,
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const validated = createSubscriptionSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid subscription request',
          details: validated.error.issues,
        },
      };
    }

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };
    const businessId = verify.business!.id;

    // Check if business already has active subscription
    const existingResult =
      await subscriptionQuery.getActiveSubscription(businessId);
    if (!('error' in existingResult)) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Business already has an active subscription',
        },
      };
    }

    // Create subscription via service layer
    return (await subscriptionService.createSubscription(
      businessId,
      validated.data,
    )) as ApiResponse<SubscriptionResponse>;
  } catch (error) {
    console.error('[subscribeToplanAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to subscribe to plan',
      },
    };
  }
}

/**
 * Update current subscription (billing cycle, payment method, auto-renew)
 * PUT /api/subscriptions/me
 */
export async function updateSubscriptionAction(
  input: UpdateSubscriptionRequest,
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const validated = updateSubscriptionSchema.safeParse(input);
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

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };
    const businessId = verify.business!.id;

    // Get active subscription
    const subResult = await subscriptionQuery.getActiveSubscription(businessId);
    if ('error' in subResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No active subscription found',
        },
      };
    }

    // Update subscription via service layer
    return (await subscriptionService.updateSubscription(
      subResult.data.id,
      validated.data,
    )) as ApiResponse<SubscriptionResponse>;
  } catch (error) {
    console.error('[updateSubscriptionAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update subscription',
      },
    };
  }
}

/**
 * Upgrade subscription to higher tier
 * POST /api/subscriptions/upgrade
 */
export async function upgradeSubscriptionAction(
  input: UpgradeSubscriptionRequest,
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const validated = upgradeSubscriptionSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid upgrade request',
          details: validated.error.issues,
        },
      };
    }

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };
    const businessId = verify.business!.id;

    // Get active subscription
    const subResult = await subscriptionQuery.getActiveSubscription(businessId);
    if ('error' in subResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No active subscription found',
        },
      };
    }

    // Upgrade subscription via service layer
    return (await subscriptionService.upgradeSubscription(
      subResult.data.id,
      validated.data,
    )) as ApiResponse<SubscriptionResponse>;
  } catch (error) {
    console.error('[upgradeSubscriptionAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upgrade subscription',
      },
    };
  }
}

/**
 * Downgrade subscription to lower tier
 * POST /api/subscriptions/downgrade
 */
export async function downgradeSubscriptionAction(
  input: DowngradeSubscriptionRequest,
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const validated = downgradeSubscriptionSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid downgrade request',
          details: validated.error.issues,
        },
      };
    }

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };
    const businessId = verify.business!.id;

    // Get active subscription
    const subResult = await subscriptionQuery.getActiveSubscription(businessId);
    if ('error' in subResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No active subscription found',
        },
      };
    }

    // Downgrade subscription via service layer
    return (await subscriptionService.downgradeSubscription(
      subResult.data.id,
      validated.data,
    )) as ApiResponse<SubscriptionResponse>;
  } catch (error) {
    console.error('[downgradeSubscriptionAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to downgrade subscription',
      },
    };
  }
}

/**
 * Cancel subscription
 * DELETE /api/subscriptions/me
 */
export async function cancelSubscriptionAction(
  input: CancelSubscriptionRequest,
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const validated = cancelSubscriptionSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid cancel request',
          details: validated.error.issues,
        },
      };
    }

    const verify = await verifyBusinessOwner();
    if (!verify.authorized)
      return { success: false, error: verify.error as ApiError };
    const businessId = verify.business!.id;

    // Get active subscription
    const subResult = await subscriptionQuery.getActiveSubscription(businessId);
    if ('error' in subResult) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No active subscription found',
        },
      };
    }

    // Cancel subscription via service layer
    return (await subscriptionService.cancelSubscription(
      subResult.data.id,
      validated.data,
    )) as ApiResponse<SubscriptionResponse>;
  } catch (error) {
    console.error('[cancelSubscriptionAction]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cancel subscription',
      },
    };
  }
}
