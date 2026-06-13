/**
 * Notification validation tests — document decision rules + list query + emit.
 */

import { describe, it, expect } from 'vitest';
import {
  documentDecisionSchema,
  notificationListQuerySchema,
  emitNotificationSchema,
  notificationTypeSchema,
} from '../notification';

describe('documentDecisionSchema', () => {
  it('accepts approve without remarks', () => {
    const r = documentDecisionSchema.safeParse({ decision: 'approve' });
    expect(r.success).toBe(true);
  });

  it('accepts approve with remarks', () => {
    const r = documentDecisionSchema.safeParse({
      decision: 'approve',
      remarks: 'looks good',
    });
    expect(r.success).toBe(true);
  });

  it('rejects disapprove without remarks', () => {
    const r = documentDecisionSchema.safeParse({ decision: 'reject' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toContain('remarks');
    }
  });

  it('rejects disapprove with empty/whitespace remarks', () => {
    expect(
      documentDecisionSchema.safeParse({ decision: 'reject', remarks: '   ' })
        .success,
    ).toBe(false);
  });

  it('accepts disapprove with remarks', () => {
    const r = documentDecisionSchema.safeParse({
      decision: 'reject',
      remarks: 'tax certificate is expired',
    });
    expect(r.success).toBe(true);
  });
});

describe('notificationListQuerySchema', () => {
  it('coerces and clamps limit within 1..50', () => {
    expect(
      notificationListQuerySchema.safeParse({ limit: '20' }),
    ).toMatchObject({ success: true });
    expect(notificationListQuerySchema.safeParse({ limit: 0 }).success).toBe(
      false,
    );
    expect(notificationListQuerySchema.safeParse({ limit: 51 }).success).toBe(
      false,
    );
  });

  it('allows an omitted cursor and limit', () => {
    expect(notificationListQuerySchema.safeParse({}).success).toBe(true);
  });

  it('rejects an empty-string cursor', () => {
    expect(notificationListQuerySchema.safeParse({ cursor: '' }).success).toBe(
      false,
    );
  });
});

describe('notificationTypeSchema', () => {
  it('accepts known types and rejects unknown', () => {
    expect(
      notificationTypeSchema.safeParse('business_document_approved').success,
    ).toBe(true);
    expect(notificationTypeSchema.safeParse('unknown_type').success).toBe(
      false,
    );
  });

  it('accepts coupon_redeemed', () => {
    expect(notificationTypeSchema.safeParse('coupon_redeemed').success).toBe(
      true,
    );
  });
});

describe('emitNotificationSchema', () => {
  it('requires a recipient uuid, type and title', () => {
    const ok = emitNotificationSchema.safeParse({
      user_id: '22222222-2222-4222-8222-222222222222',
      type: 'system',
      title: 'Hi',
    });
    expect(ok.success).toBe(true);

    const badUser = emitNotificationSchema.safeParse({
      user_id: 'not-a-uuid',
      type: 'system',
      title: 'Hi',
    });
    expect(badUser.success).toBe(false);
  });
});
