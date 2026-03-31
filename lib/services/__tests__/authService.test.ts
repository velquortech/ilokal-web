import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import http from '../client';
import authService from '../authService';

describe('authService (client wrappers)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('signup posts to /auth/signup and returns result', async () => {
    (http.post as any).mockResolvedValue({ success: true, data: { id: 'u1' } });
    const res = await authService.signup({
      email: 'a@b.com',
      password: 'secret',
      confirmPassword: 'secret',
      name: 'A',
      role: 'app_user',
    } as any);
    expect(http.post).toHaveBeenCalledWith('/auth/signup', expect.any(Object));
    expect(res).toEqual({ success: true, data: { id: 'u1' } });
  });

  it('resetPasswordRequest calls /auth/reset-password', async () => {
    (http.post as any).mockResolvedValue({ success: true, data: { message: 'sent' } });
    const res = await authService.resetPasswordRequest('a@b.com');
    expect(http.post).toHaveBeenCalledWith('/auth/reset-password', { email: 'a@b.com' });
    expect(res).toEqual({ success: true, data: { message: 'sent' } });
  });

  it('verifyEmail posts to /auth/verify-email', async () => {
    (http.post as any).mockResolvedValue({ success: true, data: { message: 'ok' } });
    const res = await authService.verifyEmail();
    expect(http.post).toHaveBeenCalledWith('/auth/verify-email');
    expect(res).toEqual({ success: true, data: { message: 'ok' } });
  });
});
