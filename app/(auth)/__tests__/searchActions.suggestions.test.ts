import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as searchActions from '@/app/(auth)/actions/searchActions';
import * as searchService from '@/lib/api/search/searchService';
import type { ApiResponse } from '@/lib/types';

vi.mock('@/lib/api/search/searchService');

describe('getSuggestionsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns suggestions from service', async () => {
    const mock: ApiResponse<{ suggestions: string[] }> = {
      success: true,
      data: { suggestions: ['Alpha', 'Beta'] },
    };
    vi.mocked(searchService.getSuggestions).mockResolvedValueOnce(mock);

    const res = await searchActions.getSuggestionsAction('a', 5);
    expect(res.success).toBe(true);
    expect(res.data?.suggestions).toEqual(['Alpha', 'Beta']);
  });

  it('returns empty suggestions for empty query', async () => {
    const res = await searchActions.getSuggestionsAction('');
    expect(res.success).toBe(true);
    expect(res.data?.suggestions).toHaveLength(0);
    expect(vi.mocked(searchService.getSuggestions)).not.toHaveBeenCalled();
  });
});
