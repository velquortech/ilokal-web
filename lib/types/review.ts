// Review domain types

export type Review = {
  id: string;
  user_id: string;
  business_id?: string | null;
  product_id?: string | null;
  rating: number; // 1-5
  title?: string | null;
  body?: string | null;
  helpful_count?: number;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
};

export type CreateReviewRequest = {
  user_id: string;
  business_id?: string | null;
  product_id?: string | null;
  rating: number;
  title?: string;
  body?: string;
};

export type UpdateReviewRequest = {
  rating?: number;
  title?: string;
  body?: string;
};

export type PaginatedReviewsResponse = {
  results: Review[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  query?: string;
};

export type RatingResponse = {
  id: string;
  average_rating: number;
  review_count: number;
};
