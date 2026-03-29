import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as searchService from '@/lib/api/search/searchService';
import * as searchQuery from '@/lib/api/search/searchQuery';
import type {
  SearchResponse,
  BusinessSearchResult,
  ProductSearchResult,
} from '@/lib/types';

vi.mock('@/lib/api/search/searchQuery');

describe('searchService.getSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns combined suggestions from businesses and products', async () => {
    const bizResults: SearchResponse<BusinessSearchResult> = {
      results: [
        { id: 'b1', name: 'Alpha Cafe' },
        { id: 'b2', name: 'Beta Store' },
      ],
      total: 2,
      page: 1,
      per_page: 5,
      total_pages: 1,
      query: 'a',
    };

    const prodResults: SearchResponse<ProductSearchResult> = {
      results: [
        { id: 'p1', name: 'Alpha Mug' },
        { id: 'p2', name: 'Gamma Lamp' },
      ],
      total: 2,
      page: 1,
      per_page: 5,
      total_pages: 1,
      query: 'a',
    };

    vi.mocked(searchQuery.searchBusinesses).mockResolvedValueOnce(bizResults);
    vi.mocked(searchQuery.searchProducts).mockResolvedValueOnce(prodResults);

    const res = await searchService.getSuggestions('a', 5);

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.suggestions.length).toBeGreaterThan(0);
    expect(res.data?.suggestions).toEqual(
      expect.arrayContaining(['Alpha Cafe', 'Alpha Mug']),
    );
  });

  it('returns empty array for empty query', async () => {
    const res = await searchService.getSuggestions('', 5);
    expect(res.success).toBe(true);
    expect(res.data?.suggestions).toHaveLength(0);
  });
});
