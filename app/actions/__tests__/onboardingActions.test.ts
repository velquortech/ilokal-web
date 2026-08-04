/**
 * Onboarding writers — the gate, not the write.
 *
 * Both exports are publicly invocable endpoints. Three things have to hold, and
 * each has burned this repo before: ownership is proved against the id the
 * CALLER passed (a `verifyBusinessOwner()` with no argument falls back to
 * whichever shop `.limit(1)` returns, which filed a two-shop owner's events
 * against the wrong one), the write uses the VERIFIED id rather than the
 * client's, and the flood guard runs — Server-Action POSTs never reach the
 * proxy's rate limiter.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import {
  markTourCompleted,
  markChecklistDismissed,
} from '@/lib/api/business/onboardingService';
import {
  completeOnboardingTourAction,
  dismissOnboardingChecklistAction,
} from '../onboardingActions';

vi.mock('@/lib/api/verifyBusinessOwner', () => ({
  verifyBusinessOwner: vi.fn(),
}));
vi.mock('@/app/api/helpers/rateLimit', () => ({ rateLimit: vi.fn() }));
vi.mock('@/lib/api/business/onboardingService', () => ({
  markTourCompleted: vi.fn(),
  markChecklistDismissed: vi.fn(),
}));

const mockedVerify = vi.mocked(verifyBusinessOwner);
const mockedRateLimit = vi.mocked(rateLimit);
const mockedTour = vi.mocked(markTourCompleted);
const mockedDismiss = vi.mocked(markChecklistDismissed);

const CLAIMED_ID = '550e8400-e29b-41d4-a716-446655440000';
const VERIFIED_ID = '550e8400-e29b-41d4-a716-4466554400ff';

function authorized() {
  mockedVerify.mockResolvedValue({
    authorized: true,
    business: { id: VERIFIED_ID },
    user: { id: 'user-1' },
  } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRateLimit.mockReturnValue({
    allowed: true,
  } as unknown as ReturnType<typeof rateLimit>);
  mockedTour.mockResolvedValue({ ok: true });
  mockedDismiss.mockResolvedValue({ ok: true });
});

describe('completeOnboardingTourAction', () => {
  it('proves ownership of the shop the caller named', async () => {
    authorized();

    await completeOnboardingTourAction(CLAIMED_ID);

    // The argument is what makes this correct for a multi-shop owner.
    expect(mockedVerify).toHaveBeenCalledWith(CLAIMED_ID);
  });

  it('writes the VERIFIED id, never the client’s', async () => {
    authorized();

    await completeOnboardingTourAction(CLAIMED_ID);

    expect(mockedTour).toHaveBeenCalledWith(VERIFIED_ID);
  });

  it('refuses a caller who does not own the shop, before any write', async () => {
    mockedVerify.mockResolvedValue({
      authorized: false,
      error: { code: 'FORBIDDEN', message: 'Not your shop' },
    } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);

    await expect(completeOnboardingTourAction(CLAIMED_ID)).resolves.toEqual({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Not your shop' },
    });
    expect(mockedTour).not.toHaveBeenCalled();
  });

  it('rate-limits per user, after auth and before the write', async () => {
    authorized();
    mockedRateLimit.mockReturnValue({
      allowed: false,
    } as unknown as ReturnType<typeof rateLimit>);

    const result = await completeOnboardingTourAction(CLAIMED_ID);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('RATE_LIMITED');
    expect(mockedRateLimit).toHaveBeenCalledWith(
      'business-onboarding-write:user-1',
      expect.any(Number),
      expect.any(Number),
    );
    expect(mockedTour).not.toHaveBeenCalled();
  });

  it('reports a failed write rather than claiming it landed', async () => {
    authorized();
    mockedTour.mockResolvedValue({ ok: false });

    await expect(completeOnboardingTourAction(CLAIMED_ID)).resolves.toEqual({
      success: true,
      data: { recorded: false },
    });
  });
});

describe('dismissOnboardingChecklistAction', () => {
  it('writes the verified id', async () => {
    authorized();

    await expect(dismissOnboardingChecklistAction(CLAIMED_ID)).resolves.toEqual(
      { success: true, data: { recorded: true } },
    );
    expect(mockedDismiss).toHaveBeenCalledWith(VERIFIED_ID);
  });

  it('shares the tour action’s gate', async () => {
    mockedVerify.mockResolvedValue({
      authorized: false,
      error: { code: 'UNAUTHORIZED', message: 'Sign in' },
    } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);

    const result = await dismissOnboardingChecklistAction(CLAIMED_ID);

    expect(result.success).toBe(false);
    expect(mockedDismiss).not.toHaveBeenCalled();
  });

  it('shares the flood guard’s key, so one budget covers both writes', async () => {
    authorized();
    await dismissOnboardingChecklistAction(CLAIMED_ID);

    expect(mockedRateLimit).toHaveBeenCalledWith(
      'business-onboarding-write:user-1',
      expect.any(Number),
      expect.any(Number),
    );
  });
});
