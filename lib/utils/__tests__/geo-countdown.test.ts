import { describe, it, expect } from 'vitest';
import { haversineKm, formatDistance, DEFAULT_MAP_CENTER } from '../geo';
import { timeLeft } from '../countdown';

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(10.7, 122.56, 10.7, 122.56)).toBe(0);
  });

  it('measures a known city-scale distance (~1.1km per 0.01° lat)', () => {
    const km = haversineKm(10.6969, 122.5644, 10.7069, 122.5644);
    expect(km).toBeGreaterThan(1.0);
    expect(km).toBeLessThan(1.2);
  });

  it('is symmetric', () => {
    const a = haversineKm(10.69, 122.56, 10.73, 122.55);
    const b = haversineKm(10.73, 122.55, 10.69, 122.56);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe('formatDistance', () => {
  it('renders metres below 1 km', () => {
    expect(formatDistance(0.85)).toBe('850 m');
  });
  it('renders one decimal below 10 km', () => {
    expect(formatDistance(1.24)).toBe('1.2 km');
  });
  it('rounds whole km beyond 10 km', () => {
    expect(formatDistance(12.4)).toBe('12 km');
  });
  it('is empty for invalid input', () => {
    expect(formatDistance(NaN)).toBe('');
    expect(formatDistance(-1)).toBe('');
  });
});

describe('DEFAULT_MAP_CENTER', () => {
  it('is Iloilo City Proper ([lat, lng])', () => {
    const [lat, lng] = DEFAULT_MAP_CENTER;
    expect(lat).toBeGreaterThan(10);
    expect(lat).toBeLessThan(11);
    expect(lng).toBeGreaterThan(122);
    expect(lng).toBeLessThan(123);
  });
});

describe('timeLeft', () => {
  const now = Date.parse('2026-07-25T12:00:00Z');

  it('handles no expiry', () => {
    expect(timeLeft(null, now)).toEqual({
      expired: false,
      label: 'No expiry',
      urgent: false,
    });
  });

  it('flags expired', () => {
    const result = timeLeft('2026-07-25T11:59:59Z', now);
    expect(result.expired).toBe(true);
    expect(result.label).toBe('Expired');
  });

  it('renders days when 2+ days remain (not urgent)', () => {
    const result = timeLeft('2026-07-28T12:00:00Z', now);
    expect(result).toEqual({
      expired: false,
      label: '3 days left',
      urgent: false,
    });
  });

  it('renders hours+minutes inside the last day as urgent', () => {
    const result = timeLeft('2026-07-25T15:30:00Z', now);
    expect(result.expired).toBe(false);
    expect(result.label).toBe('3h 30m left');
    expect(result.urgent).toBe(true);
  });

  it('renders minutes under an hour as urgent', () => {
    const result = timeLeft('2026-07-25T12:45:00Z', now);
    expect(result.label).toBe('45m left');
    expect(result.urgent).toBe(true);
  });

  it('renders sub-minute as urgent', () => {
    const result = timeLeft('2026-07-25T12:00:30Z', now);
    expect(result.label).toBe('Less than a minute');
    expect(result.urgent).toBe(true);
  });
});
