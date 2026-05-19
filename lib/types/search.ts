/**
 * Search & Discovery domain types
 * Types for search, filtering, and trending functionality
 */

export type SearchType = 'business' | 'product' | 'deal' | 'all';

export type SortBy = 'relevance' | 'newest' | 'popular' | 'rating' | 'distance';

export type BusinessSearchResult = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  rating: number | null;
  review_count: number;
  status: 'pending' | 'verified' | 'suspended' | 'rejected';
  location: string | null;
  image_url: string | null;
};

export type ProductSearchResult = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_cents: number | null;
  rating: number | null;
  review_count: number;
  business_id: string;
  business_name: string;
  image_url: string | null;
};

export type DealSearchResult = {
  id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
  is_featured: boolean;
  expires_at: string | null;
  business_id: string;
  business_name: string;
  image_url: string | null;
};

export type TrendingResult = {
  id: string;
  type: 'business' | 'product';
  name: string;
  description: string | null;
  trend_score: number;
  view_count: number;
  engagement_count: number;
};

export type PaginationParams = {
  page: number;
  per_page: number;
};

export type SearchFilters = {
  category?: string;
  min_rating?: number;
  max_rating?: number;
  min_price?: number;
  max_price?: number;
  verified_only?: boolean;
  is_featured?: boolean;
  location?: string;
  distance_km?: number;
};

export type SearchRequest = {
  query: string;
  type?: SearchType;
  filters?: SearchFilters;
  sort_by?: SortBy;
  pagination?: PaginationParams;
};

export type SearchResponse<T> = {
  results: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  query: string;
};

export type GlobalSearchResponse = {
  businesses: SearchResponse<BusinessSearchResult>;
  products: SearchResponse<ProductSearchResult>;
  deals: SearchResponse<DealSearchResult>;
};

export type TrendingResponse = {
  trending: TrendingResult[];
  period: 'today' | 'week' | 'month';
  total: number;
};

// Request types for API

export type GlobalSearchRequest = SearchRequest & {
  type: 'all';
};

export type BusinessSearchRequest = SearchRequest & {
  type: 'business';
};

export type ProductSearchRequest = SearchRequest & {
  type: 'product';
};

export type DealSearchRequest = SearchRequest & {
  type: 'deal';
};

export type AdvancedFilterRequest = {
  category?: string;
  min_rating?: number;
  max_rating?: number;
  min_price?: number;
  max_price?: number;
  verified_only?: boolean;
  is_featured?: boolean;
  location?: string;
};
