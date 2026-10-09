import { describe, expect, it } from 'vitest';
import { isRegistrationUnfinished } from '../registration';

describe('isRegistrationUnfinished', () => {
  it('is true only when the column is present and NULL', () => {
    expect(isRegistrationUnfinished({ registration_completed_at: null })).toBe(
      true,
    );
    expect(
      isRegistrationUnfinished({
        registration_completed_at: '2026-10-09T00:00:00Z',
      }),
    ).toBe(false);
  });

  it('treats a missing column as finished, so a pre-migration database never locks owners out', () => {
    expect(isRegistrationUnfinished({})).toBe(false);
    expect(isRegistrationUnfinished(null)).toBe(false);
    expect(isRegistrationUnfinished(undefined)).toBe(false);
  });
});
