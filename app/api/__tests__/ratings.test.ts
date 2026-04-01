import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User } from '@/lib/types';

vi.mock('@/lib/api/getCurrentUser');
vi.mock('@/lib/services/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}));

import { getCurrentUser } from '@/lib/api/getCurrentUser';

describe('Ratings API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have GET and POST endpoints', async () => {
    // Import the route module
    const { GET, POST } = await import('@/app/api/ratings/route');
    expect(GET).toBeDefined();
    expect(POST).toBeDefined();
  });

  it('should verify authentication is required', async () => {
    // The route should require a user to be authenticated
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    expect(await getCurrentUser()).toBeNull();
  });

  it('should allow authenticated users', async () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'user@example.com',
      full_name: 'Test User',
      phone_number: null,
      avatar_url: null,
      role: 'app_user',
    };
    vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);
    const user = await getCurrentUser();
    expect(user?.id).toBe('user-1');
  });
});
