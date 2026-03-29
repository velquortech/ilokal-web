/**
 * Branch Type Definitions
 * Location management for businesses
 */

export type Branch = {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  } | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type BranchResponse = Branch & {
  distance_km?: number; // For proximity searches
};

export type CreateBranchRequest = {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

export type UpdateBranchRequest = Partial<CreateBranchRequest>;

export type BranchFilters = {
  page?: number;
  per_page?: number;
  search?: string; // Search by name or address
  latitude?: number; // For proximity search
  longitude?: number;
  radius_km?: number; // Search radius in kilometers
  sort_by?: 'name_asc' | 'name_desc' | 'newest' | 'oldest';
};

export type PaginatedBranchesResponse = {
  branches: BranchResponse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type BranchError =
  | 'BRANCH_NOT_FOUND'
  | 'INVALID_LOCATION'
  | 'BRANCH_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED';
