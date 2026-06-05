/**
 * Branch Type Definitions
 * Location management for businesses
 */

export type BranchStatus = 'pending_review' | 'active' | 'rejected';

export type Branch = {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  } | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  status: BranchStatus;
  rejection_reason: string | null;
  cover_image_url: string | null;
  gallery_images: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type BranchDocument = {
  id: string;
  branch_id: string;
  document_type: 'business_permit' | 'other_document';
  file_url: string;
  created_at: string;
};

export type BranchResponse = Branch & {
  distance_km?: number; // For proximity searches
};

export type CreateBranchRequest = {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  description?: string;
  status?: BranchStatus;
  business_permit_url?: string;
  other_document_url?: string;
  cover_image_url?: string | null;
  gallery_images?: string[];
};

export type UpdateBranchRequest = Partial<CreateBranchRequest>;

export type BranchFilters = {
  page?: number;
  per_page?: number;
  search?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  sort_by?: 'name_asc' | 'name_desc' | 'newest' | 'oldest';
  status?: BranchStatus | 'all';
};

export type PaginatedBranchesResponse = {
  branches: BranchResponse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type BranchStats = {
  total: number;
  with_location: number;
  without_location: number;
};

export type BranchError =
  | 'BRANCH_NOT_FOUND'
  | 'INVALID_LOCATION'
  | 'BRANCH_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED';
