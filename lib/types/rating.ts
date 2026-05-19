// Rating domain types

export type Rating = {
  id: string;
  user_id: string;
  product_id?: string | null;
  business_id?: string | null;
  rating: number; // 1-5
  review_text?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
};

export type CreateRatingRequest = {
  product_id?: string;
  business_id?: string;
  rating: number;
  review_text?: string;
};

export type UpdateRatingRequest = Partial<CreateRatingRequest>;

export type RatingStats = {
  average_rating: number;
  total_ratings: number;
  rating_distribution: {
    [key: number]: number; // 1-5 star counts
  };
};
