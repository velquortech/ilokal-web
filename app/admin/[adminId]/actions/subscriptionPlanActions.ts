'use server';

/**
 * Subscription Plan Management Server Actions
 * Admin-only actions for creating, updating, and deleting subscription plans
 */

import type { ApiResponse } from '@/lib/types';

async function callPlanApi(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<ApiResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const url = new URL(`/api/admin/subscriptions/plans${path}`, baseUrl);

    const response = await fetch(url.toString(), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      return await response.json();
    }

    return await response.json();
  } catch (error) {
    console.error('[callPlanApi]', error);
    return {
      success: false,
      error: {
        code: 'ACTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * List all subscription plans (admin only)
 */
export async function listSubscriptionPlansAction(): Promise<ApiResponse> {
  return callPlanApi('', 'GET');
}

/**
 * Get specific subscription plan details (admin only)
 */
export async function getSubscriptionPlanAction(
  planId: string,
): Promise<ApiResponse> {
  return callPlanApi(`/${planId}`, 'GET');
}

/**
 * Create new subscription plan (admin only)
 * @param input Plan data: name, description, price, interval, features
 */
export async function createSubscriptionPlanAction(
  input: Record<string, unknown>,
): Promise<ApiResponse> {
  if (!input.name || typeof input.price !== 'number' || !input.interval) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'name, price, and interval are required',
      },
    };
  }

  return callPlanApi('', 'POST', input);
}

/**
 * Update subscription plan (admin only)
 * @param planId Plan ID to update
 * @param input Partial plan data to update
 */
export async function updateSubscriptionPlanAction(
  planId: string,
  input: Record<string, unknown>,
): Promise<ApiResponse> {
  if (!planId) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'planId is required' },
    };
  }

  return callPlanApi(`/${planId}`, 'PUT', input);
}

/**
 * Delete subscription plan (admin only)
 * Note: Cannot delete plans with active subscriptions
 * @param planId Plan ID to delete
 */
export async function deleteSubscriptionPlanAction(
  planId: string,
): Promise<ApiResponse> {
  if (!planId) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'planId is required' },
    };
  }

  return callPlanApi(`/${planId}`, 'DELETE');
}
