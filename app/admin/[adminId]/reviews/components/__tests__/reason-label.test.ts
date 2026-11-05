import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../actions/reviewModerationActions', () => ({
  moderateReviewAction: vi.fn(),
}));

import { reasonLabel } from '../review-moderation-content';

describe('reasonLabel', () => {
  it('names the auto-hide and the page-generated admin reasons', () => {
    expect(reasonLabel('auto:reports')).toBe('Auto-hidden by reports');
    expect(reasonLabel('admin:hide')).toBe('Hidden by an admin');
    expect(reasonLabel('admin:remove')).toBe('Removed by an admin');
  });

  it('passes a free-text reason through', () => {
    expect(reasonLabel('doxxing the owner')).toBe('doxxing the owner');
  });
});
