import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BusinessSettings, NotificationPreferences } from '@/lib/types';

vi.mock('../settingsQuery', () => ({
  getBusinessSettings: vi.fn(),
  upsertBusinessSettings: vi.fn(),
  getNotificationPreferences: vi.fn(),
  upsertNotificationPreferences: vi.fn(),
}));

import * as q from '../settingsQuery';
import {
  getBusinessSettingsService,
  upsertBusinessSettingsService,
  getNotificationPreferencesService,
  upsertNotificationPreferencesService,
} from '../settingsService';

const BID = 'biz-00000000-0000-0000-0000-000000000001';
const UID = 'user-0000-0000-0000-000000000001';

const mockSettings: BusinessSettings = {
  business_id: BID,
  operating_hours: null,
  social_links: null,
  contact_website: null,
  contact_phone_public: null,
  allow_reviews: true,
  coupon_default_expiry_days: 30,
};

const mockPrefs: NotificationPreferences = {
  user_id: UID,
  email: true,
  push: false,
  digest: 'weekly',
};

beforeEach(() => vi.clearAllMocks());

// ── getBusinessSettingsService ────────────────────────────────────────────────

describe('getBusinessSettingsService', () => {
  it('wraps null result in success response', async () => {
    vi.mocked(q.getBusinessSettings).mockResolvedValueOnce(null);
    const result = await getBusinessSettingsService(BID);
    expect(result).toEqual({ success: true, data: null });
  });

  it('wraps data in success response', async () => {
    vi.mocked(q.getBusinessSettings).mockResolvedValueOnce(mockSettings);
    const result = await getBusinessSettingsService(BID);
    expect(result).toEqual({ success: true, data: mockSettings });
  });

  it('returns error response on thrown exception', async () => {
    vi.mocked(q.getBusinessSettings).mockRejectedValueOnce(new Error('boom'));
    const result = await getBusinessSettingsService(BID);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INTERNAL_ERROR');
  });
});

// ── upsertBusinessSettingsService ─────────────────────────────────────────────

describe('upsertBusinessSettingsService', () => {
  it('returns success response with saved data', async () => {
    vi.mocked(q.upsertBusinessSettings).mockResolvedValueOnce(mockSettings);
    const result = await upsertBusinessSettingsService(BID, {
      allow_reviews: true,
    });
    expect(result).toEqual({ success: true, data: mockSettings });
  });

  it('returns error response when query throws', async () => {
    vi.mocked(q.upsertBusinessSettings).mockRejectedValueOnce(
      new Error('DB error'),
    );
    const result = await upsertBusinessSettingsService(BID, {});
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DB_ERROR');
    expect(result.error?.message).toBe('DB error');
  });
});

// ── getNotificationPreferencesService ────────────────────────────────────────

describe('getNotificationPreferencesService', () => {
  it('returns null when no preferences exist', async () => {
    vi.mocked(q.getNotificationPreferences).mockResolvedValueOnce(null);
    const result = await getNotificationPreferencesService(UID);
    expect(result).toEqual({ success: true, data: null });
  });

  it('returns preferences on success', async () => {
    vi.mocked(q.getNotificationPreferences).mockResolvedValueOnce(mockPrefs);
    const result = await getNotificationPreferencesService(UID);
    expect(result).toEqual({ success: true, data: mockPrefs });
  });
});

// ── upsertNotificationPreferencesService ─────────────────────────────────────

describe('upsertNotificationPreferencesService', () => {
  it('returns saved preferences on success', async () => {
    vi.mocked(q.upsertNotificationPreferences).mockResolvedValueOnce(mockPrefs);
    const result = await upsertNotificationPreferencesService(UID, {
      email: true,
      push: false,
      digest: 'weekly',
    });
    expect(result).toEqual({ success: true, data: mockPrefs });
  });

  it('returns error response when query throws', async () => {
    vi.mocked(q.upsertNotificationPreferences).mockRejectedValueOnce(
      new Error('Write failed'),
    );
    const result = await upsertNotificationPreferencesService(UID, {
      email: false,
      push: false,
      digest: 'none',
    });
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Write failed');
  });
});
