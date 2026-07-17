import { describe, it, expect } from 'vitest';
import { checkAuthRateLimit } from '../auth-rate-limit';

// The underlying limiter keeps module-level state, so each test uses a unique
// scope / IP / email to avoid cross-test bleed. Defaults (overridable by env):
//   IP:      30 / 60s
//   account: 8  / 300s

function reqWithIp(ip: string): { headers: Headers } {
  return { headers: new Headers({ 'x-forwarded-for': ip }) };
}

describe('checkAuthRateLimit', () => {
  it('allows requests under both budgets', () => {
    const res = checkAuthRateLimit(reqWithIp('10.0.0.1'), 't1', 'a@ex.com');
    expect(res).toBeNull();
  });

  it('blocks once the per-account budget (8) is exceeded', () => {
    const req = reqWithIp('10.0.0.2');
    // 8 allowed, 9th tripped by the account budget (tighter than IP's 30).
    for (let i = 0; i < 8; i++) {
      expect(checkAuthRateLimit(req, 't2', 'victim@ex.com')).toBeNull();
    }
    const blocked = checkAuthRateLimit(req, 't2', 'victim@ex.com');
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(Number(blocked!.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('blocks on the per-IP budget (30) even across different accounts', () => {
    const req = reqWithIp('10.0.0.3');
    // 30 distinct emails → account budget never trips, IP budget does at 31.
    for (let i = 0; i < 30; i++) {
      expect(checkAuthRateLimit(req, 't3', `u${i}@ex.com`)).toBeNull();
    }
    const blocked = checkAuthRateLimit(req, 't3', 'u999@ex.com');
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it('isolates budgets per scope', () => {
    const req = reqWithIp('10.0.0.4');
    for (let i = 0; i < 8; i++) {
      checkAuthRateLimit(req, 'login', 'shared@ex.com');
    }
    // Same IP + email but a different scope has its own fresh budget.
    expect(checkAuthRateLimit(req, 'signup', 'shared@ex.com')).toBeNull();
  });

  it('normalizes email case so budget cannot be evaded by casing', () => {
    const req = reqWithIp('10.0.0.5');
    for (let i = 0; i < 8; i++) {
      checkAuthRateLimit(req, 't5', 'Mixed@Ex.com');
    }
    const blocked = checkAuthRateLimit(req, 't5', 'mixed@ex.com');
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it('checks only the IP budget when no email is provided', () => {
    const res = checkAuthRateLimit(reqWithIp('10.0.0.6'), 't6');
    expect(res).toBeNull();
  });
});
