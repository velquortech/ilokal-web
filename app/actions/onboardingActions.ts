'use server';

/**
 * Onboarding state — business-owner Server Actions.
 *
 * Both exports are publicly invocable endpoints, so each one validates the id's
 * shape, proves ownership of THAT shop with the **route segment's** id (never a
 * `verifyBusinessOwner()` with no argument, which falls back to whichever shop
 * `.limit(1)` returns and files a two-shop owner's answer against the wrong
 * one), and passes a per-user flood guard — Server-Action POSTs never reach the
 * proxy's rate limiter.
 *
 * Deliberately NOT behind `enable_onboarding_tour`: a shop that answered the
 * tour while the flag was on must still be able to record a dismissal if an
 * admin flips it mid-session, and neither write exposes anything.
 *
 * Neither revalidates the dashboard. Both are fire-and-forget from a client
 * that has already hidden the thing being recorded; a `revalidatePath` here
 * would re-render the page under the owner to change nothing they can see.
 *
 * Lives in `app/actions/` rather than under `app/business/[businessId]/` for
 * the reason `notificationActions` was moved there: the callers are shared
 * components in `components/custom/`, and a shared component reaching into one
 * route's action folder is how that folder stops being one route's.
 */

import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import {
  markTourCompleted,
  markChecklistDismissed,
} from '@/lib/api/business/onboardingService';
import type { ApiError, ApiResponse } from '@/lib/types';

const RATE_LIMIT = Number(process.env.BUSINESS_ACTION_RATE_LIMIT ?? 30);
const RATE_WINDOW_MS = Number(
  process.env.BUSINESS_ACTION_RATE_WINDOW_MS ?? 60_000,
);

type Guard =
  | { ok: true; businessId: string }
  | { ok: false; response: ApiResponse<never> };

function fail(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}

async function guard(businessId: string): Promise<Guard> {
  // Validates the id's shape and proves the caller owns that exact shop.
  const verify = await verifyBusinessOwner(businessId);
  if (!verify.authorized) {
    // `verifyBusinessOwner`'s error is a union that also has a `NextResponse`
    // arm; narrow rather than cast, or that arm would be serialised into an
    // `ApiResponse` body.
    const error: ApiError =
      verify.error && typeof verify.error === 'object' && 'code' in verify.error
        ? (verify.error as ApiError)
        : {
            code: 'UNAUTHORIZED',
            message: 'You do not have access to this shop.',
          };
    return { ok: false, response: { success: false, error } };
  }

  const userId = verify.user?.id;
  // No id means no bucket to rate-limit against, so treat it as unauthorized
  // rather than letting the write through unthrottled.
  if (!userId) {
    return {
      ok: false,
      response: fail('UNAUTHORIZED', 'You do not have access to this shop.'),
    };
  }

  const { allowed } = rateLimit(
    `business-onboarding-write:${userId}`,
    RATE_LIMIT,
    RATE_WINDOW_MS,
  );
  if (!allowed) {
    return {
      ok: false,
      response: fail(
        'RATE_LIMITED',
        'Too many requests — please try again in a moment.',
      ),
    };
  }

  // The VERIFIED id, not the client's.
  return { ok: true, businessId: verify.business!.id };
}

export async function completeOnboardingTourAction(
  businessId: string,
): Promise<ApiResponse<{ recorded: boolean }>> {
  const gate = await guard(businessId);
  if (!gate.ok) return gate.response;

  const { ok } = await markTourCompleted(gate.businessId);
  // A failed write is reported, not thrown: the caller has already closed the
  // tour, and its localStorage echo keeps this device quiet either way.
  return { success: true, data: { recorded: ok } };
}

export async function dismissOnboardingChecklistAction(
  businessId: string,
): Promise<ApiResponse<{ recorded: boolean }>> {
  const gate = await guard(businessId);
  if (!gate.ok) return gate.response;

  const { ok } = await markChecklistDismissed(gate.businessId);
  return { success: true, data: { recorded: ok } };
}
