/**
 * Search query layer - Database read operations
 * All search and discovery related queries
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  SearchResponse,
  BusinessSearchResult,
  ProductSearchResult,
  DealSearchResult,
  TrendingResult,
} from '@/lib/types';
import type {
  SearchFiltersInput,
  PaginationParams,
} from '@/lib/validation/search';

/**
 * Search businesses globally
 */
export async function searchBusinesses(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
): Promise<SearchResponse<BusinessSearchResult>> {
  const supabase = await createServerSupabaseClient();
  const page = pagination?.page || 1;
  const perPage = pagination?.per_page || 20;
  const offset = (page - 1) * perPage;

  // Build search query
  let searchQuery = supabase
    .from('profiles')
    .select(
      `
      id,
      name,
      description,
      category,
      average_rating,
      review_count,
      is_verified,
      address,
      avatar_url
    `,
      { count: 'exact' },
    )
    .eq('role', 'business')
    .is('archived_at', null);

  // Text search (full text search on name and description)
  if (query) {
    searchQuery = searchQuery.ilike('name', `%${query}%`);
  }

  // Apply filters
  if (filters) {
    if (filters.category) {
      searchQuery = searchQuery.eq('category', filters.category);
    }
    if (filters.min_rating !== undefined) {
      searchQuery = searchQuery.gte('average_rating', filters.min_rating);
    }
    if (filters.max_rating !== undefined) {
      searchQuery = searchQuery.lte('average_rating', filters.max_rating);
    }
    if (filters.is_verified !== undefined) {
      searchQuery = searchQuery.eq('is_verified', filters.is_verified);
    }
  }

  // Apply sorting
  if (sortBy === 'rating') {
    searchQuery = searchQuery.order('average_rating', { ascending: false });
  } else if (sortBy === 'popular') {
    searchQuery = searchQuery.order('review_count', { ascending: false });
  } else if (sortBy === 'newest') {
    searchQuery = searchQuery.order('created_at', { ascending: false });
  } else {
    // Default relevance (by creation date)
    searchQuery = searchQuery.order('created_at', { ascending: false });
  }

  // Apply pagination
  const { data, count, error } = await searchQuery.range(
    offset,
    offset + perPage - 1,
  );

  if (error) {
    console.error('[searchBusinesses]', error);
    return {
      results: [],
      total: 0,
      page,
      per_page: perPage,
      total_pages: 0,
      query,
    };
  }

  const results: BusinessSearchResult[] = (data || []).map((business) => ({
    id: business.id,
    name: business.name,
    description: business.description,
    category: business.category,
    rating: business.average_rating,
    review_count: business.review_count || 0,
    is_verified: business.is_verified || false,
    location: business.address,
    image_url: business.avatar_url,
  }));

  const totalPages = Math.ceil((count || 0) / perPage);

  return {
    results,
    total: count || 0,
    page,
    per_page: perPage,
    total_pages: totalPages,
    query,
  };
}

/**
 * Search products globally
 */
export async function searchProducts(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
): Promise<SearchResponse<ProductSearchResult>> {
  const supabase = await createServerSupabaseClient();
  const page = pagination?.page || 1;
  const perPage = pagination?.per_page || 20;
  const offset = (page - 1) * perPage;

  // Build search query
  let searchQuery = supabase
    .from('products')
    .select(
      `
      id,
      name,
      description,
      category,
      price_cents,
      average_rating,
      review_count,
      business_id,
      profiles:business_id(name),
      image_url
    `,
      { count: 'exact' },
    )
    .is('archived_at', null);

  // Text search
  if (query) {
    searchQuery = searchQuery.ilike('name', `%${query}%`);
  }

  // Apply filters
  if (filters) {
    if (filters.category) {
      searchQuery = searchQuery.eq('category', filters.category);
    }
    if (filters.min_price !== undefined) {
      searchQuery = searchQuery.gte('price_cents', filters.min_price);
    }
    if (filters.max_price !== undefined) {
      searchQuery = searchQuery.lte('price_cents', filters.max_price);
    }
    if (filters.min_rating !== undefined) {
      searchQuery = searchQuery.gte('average_rating', filters.min_rating);
    }
    if (filters.max_rating !== undefined) {
      searchQuery = searchQuery.lte('average_rating', filters.max_rating);
    }
  }

  // Apply sorting
  if (sortBy === 'rating') {
    searchQuery = searchQuery.order('average_rating', { ascending: false });
  } else if (sortBy === 'popular') {
    searchQuery = searchQuery.order('review_count', { ascending: false });
  } else if (sortBy === 'newest') {
    searchQuery = searchQuery.order('created_at', { ascending: false });
  }

  // Apply pagination
  const { data, count, error } = await searchQuery.range(
    offset,
    offset + perPage - 1,
  );

  if (error) {
    console.error('[searchProducts]', error);
    return {
      results: [],
      total: 0,
      page,
      per_page: perPage,
      total_pages: 0,
      query,
    };
  }

  const results: ProductSearchResult[] = (data || []).map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    price_cents: product.price_cents,
    rating: product.average_rating,
    review_count: product.review_count || 0,
    business_id: product.business_id,
    business_name:
      (product.profiles as unknown as { name?: string })?.name ||
      'Unknown Business',
    image_url: product.image_url,
  }));

  const totalPages = Math.ceil((count || 0) / perPage);

  return {
    results,
    total: count || 0,
    page,
    per_page: perPage,
    total_pages: totalPages,
    query,
  };
}

/**
 * Search deals (coupons & featured deals)
 */
export async function searchDeals(
  query: string,
  filters?: SearchFiltersInput,
  pagination?: PaginationParams,
  sortBy: string = 'relevance',
): Promise<SearchResponse<DealSearchResult>> {
  const supabase = await createServerSupabaseClient();
  const page = pagination?.page || 1;
  const perPage = pagination?.per_page || 20;
  const offset = (page - 1) * perPage;

  // Build search query - search featured deals only for now
  let searchQuery = supabase
    .from('featured_deals')
    .select(
      `
      id,
      title,
      description,
      discount_percent,
      is_active,
      business_id,
      profiles:business_id(name),
      image_url,
      created_at,
      expires_at
    `,
      { count: 'exact' },
    )
    .eq('is_active', true)
    .is('archived_at', null);

  // Text search
  if (query) {
    searchQuery = searchQuery.ilike('title', `%${query}%`);
  }

  // Apply filters
  if (filters?.is_featured !== undefined) {
    searchQuery = searchQuery.eq('is_active', filters.is_featured);
  }

  // Apply sorting
  if (sortBy === 'newest') {
    searchQuery = searchQuery.order('created_at', { ascending: false });
  } else if (sortBy === 'popular') {
    searchQuery = searchQuery.order('view_count', { ascending: false });
  }

  // Apply pagination
  const { data, count, error } = await searchQuery.range(
    offset,
    offset + perPage - 1,
  );

  if (error) {
    console.error('[searchDeals]', error);
    return {
      results: [],
      total: 0,
      page,
      per_page: perPage,
      total_pages: 0,
      query,
    };
  }

  const results: DealSearchResult[] = (data || []).map((deal) => ({
    id: deal.id,
    title: deal.title,
    description: deal.description,
    discount_percent: deal.discount_percent,
    is_featured: deal.is_active,
    expires_at: deal.expires_at,
    business_id: deal.business_id,
    business_name:
      (deal.profiles as unknown as { name?: string })?.name ||
      'Unknown Business',
    image_url: deal.image_url,
  }));

  const totalPages = Math.ceil((count || 0) / perPage);

  return {
    results,
    total: count || 0,
    page,
    per_page: perPage,
    total_pages: totalPages,
    query,
  };
}

/**
 * Get trending businesses and products
 */
export async function getTrending(
  period: 'today' | 'week' | 'month' = 'week',
  type: 'business' | 'product' | 'all' = 'all',
  limit: number = 10,
): Promise<TrendingResult[]> {
  const supabase = await createServerSupabaseClient();

  // Calculate date range
  const now = new Date();
  let startDate: Date;

  if (period === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const trending: TrendingResult[] = [];

  // Get trending businesses
  if (type === 'business' || type === 'all') {
    const { data: businesses, error: bizError } = await supabase
      .from('profiles')
      .select('id, name, description, review_count, average_rating, created_at')
      .eq('role', 'business')
      .is('archived_at', null)
      .gte('updated_at', startDate.toISOString())
      .order('review_count', { ascending: false })
      .limit(limit);

    if (!bizError && businesses) {
      trending.push(
        ...businesses.map((biz) => ({
          id: biz.id,
          type: 'business' as const,
          name: biz.name,
          description: biz.description,
          trend_score:
            (biz.review_count || 0) * 0.5 + (biz.average_rating || 0),
          view_count: biz.review_count || 0,
          engagement_count: biz.review_count || 0,
        })),
      );
    }
  }

  // Get trending products
  if (type === 'product' || type === 'all') {
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, description, review_count, average_rating, created_at')
      .is('archived_at', null)
      .gte('updated_at', startDate.toISOString())
      .order('review_count', { ascending: false })
      .limit(limit);

    if (!prodError && products) {
      trending.push(
        ...products.map((prod) => ({
          id: prod.id,
          type: 'product' as const,
          name: prod.name,
          description: prod.description,
          trend_score:
            (prod.review_count || 0) * 0.5 + (prod.average_rating || 0),
          view_count: prod.review_count || 0,
          engagement_count: prod.review_count || 0,
        })),
      );
    }
  }

  // Sort by trend score and limit
  return trending.sort((a, b) => b.trend_score - a.trend_score).slice(0, limit);
}
