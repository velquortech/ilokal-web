import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as reviewService from '@/lib/api/reviews/reviewService';
import * as reviewQuery from '@/lib/api/reviews/reviewQuery';

vi.mock('@/lib/api/reviews/reviewQuery');

describe('reviewService.getRating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns rating data when query succeeds', async () => {
    vi.mocked(reviewQuery.getAverageRating).mockResolvedValueOnce({
      average_rating: 4.2,
      review_count: 10,
    });

    const res = await reviewService.getRating('b1', 'business');

    expect(res.success).toBe(true);
    expect(res.data).toEqual({
      id: 'b1',
      average_rating: 4.2,
      review_count: 10,
    });
  });

  it('returns error when query throws', async () => {
    vi.mocked(reviewQuery.getAverageRating).mockRejectedValueOnce(
      new Error('db'),
    );

    const res = await reviewService.getRating('p1', 'product');

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});
