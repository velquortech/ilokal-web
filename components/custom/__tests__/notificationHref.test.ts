/**
 * notificationHref — decides where a notification deep-links on click.
 *
 * One function serves both audiences: the bell is mounted in the business
 * header AND the admin header, and RLS decides which rows each caller sees, so
 * the destination follows from the TYPE rather than from who is looking.
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

describe('event notifications deep-link to the right surface', () => {
  it('sends an admin to the review queue, keyed by their own id', () => {
    // Only admins receive this type, and admin routes are keyed by the
    // admin's own id — which IS the recipient, so no extra context is needed.
    const href = notificationHref(
      make({
        type: 'event_proposal_submitted',
        user_id: 'admin-1',
        business_id: 'biz-1',
      }),
    );
    expect(href).toBe('/admin/admin-1/events');
  });

  it.each(['event_proposal_approved', 'event_proposal_rejected'] as const)(
    'sends the owner to their own event list on %s',
    (type) => {
      const href = notificationHref(make({ type, business_id: 'biz-1' }));
      expect(href).toBe('/business/biz-1/events');
    },
  );

  it('opens the event itself for a nearby alert', () => {
    const href = notificationHref(
      make({
        type: 'event_nearby',
        metadata: { event_id: 'evt-9' },
      }),
    );
    expect(href).toBe('/events/evt-9');
  });

  it('links nowhere rather than to a broken URL when context is missing', () => {
    expect(
      notificationHref(
        make({ type: 'event_proposal_approved', business_id: null }),
      ),
    ).toBeNull();
    expect(
      notificationHref(make({ type: 'event_nearby', metadata: {} })),
    ).toBeNull();
    // A non-string id from untyped JSONB must not become a path.
    expect(
      notificationHref(
        make({ type: 'event_nearby', metadata: { event_id: 42 } }),
      ),
    ).toBeNull();
  });
});
