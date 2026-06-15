/**
 * notificationHref — decides where a notification deep-links on click.
 * coupon_redeemed opens the business's Redeemed Coupons page; other types only
 * mark read (null).
 */

import { describe, it, expect } from 'vitest';
import type { Notification } from '@/lib/types';
import { notificationHref } from '../NotificationBell';

const BUSINESS_ID = '22222222-2222-2222-2222-222222222222';

function make(overrides: Partial<Notification>): Notification {
  return {
    id: 'n1',
    user_id: 'u1',
    type: 'system',
    title: 't',
    body: null,
    business_id: null,
    actor_id: null,
    metadata: {},
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('notificationHref', () => {
  it('links coupon_redeemed to the business Redeemed Coupons page', () => {
    const href = notificationHref(
      make({ type: 'coupon_redeemed', business_id: BUSINESS_ID }),
    );
    expect(href).toBe(`/business/${BUSINESS_ID}/redeemed-coupons`);
  });

  it('returns null for coupon_redeemed without a business_id', () => {
    expect(
      notificationHref(make({ type: 'coupon_redeemed', business_id: null })),
    ).toBeNull();
  });

  it('returns null for non-redemption types', () => {
    expect(
      notificationHref(
        make({ type: 'business_document_approved', business_id: BUSINESS_ID }),
      ),
    ).toBeNull();
  });
});
