import { createServerSupabaseClient } from '@/supabase/server';
import type { PaginatedReviewsResponse, Review } from '@/lib/types';

export async function getReviews(
  page = 1,
  per_page = 20,
  entityFilter?: { business_id?: string; product_id?: string },
): Promise<PaginatedReviewsResponse> {
  const supabase = await createServerSupabaseClient();
  const offset = (page - 1) * per_page;

  let qb = supabase
    .from('reviews')
    .select(
      `id, user_id, business_id, product_id, rating, title, body, helpful_count, created_at, updated_at, archived_at`,
      { count: 'exact' },
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (entityFilter?.business_id)
    qb = qb.eq('business_id', entityFilter.business_id);
  if (entityFilter?.product_id)
    qb = qb.eq('product_id', entityFilter.product_id);

  const { data, count, error } = await qb.range(offset, offset + per_page - 1);

  if (error) {
    console.error('[getReviews]', error);
    return {
      results: [],
      total: 0,
      page,
      per_page,
      total_pages: 0,
    } as PaginatedReviewsResponse;
  }

  type DBReviewRow = {
    id: string;
    user_id: string;
    business_id?: string | null;
    product_id?: string | null;
    rating: number;
    title?: string | null;
    body?: string | null;
    helpful_count?: number | null;
    created_at?: string;
    updated_at?: string;
    archived_at?: string | null;
  };

  const results: Review[] = (data || []).map((r: DBReviewRow) => ({
    id: r.id,
    user_id: r.user_id,
    business_id: r.business_id,
    product_id: r.product_id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    helpful_count: r.helpful_count || 0,
    created_at: r.created_at,
    updated_at: r.updated_at,
    archived_at: r.archived_at,
  }));

  return {
    results,
    total: count || 0,
    page,
    per_page,
    total_pages: Math.ceil((count || 0) / per_page),
  };
}

export async function createReview(data: Record<string, unknown>) {
  const supabase = await createServerSupabaseClient();
  const { data: inserted, error } = await supabase
    .from('reviews')
    .insert(data)
    .select()
    .single();
  if (error) {
    console.error('[createReview]', error);
    throw error;
  }
  return inserted;
}

export async function updateReview(id: string, patch: Record<string, unknown>) {
  const supabase = await createServerSupabaseClient();
  const { data: updated, error } = await supabase
    .from('reviews')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('[updateReview]', error);
    throw error;
  }
  return updated;
}

export async function deleteReview(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: deleted, error } = await supabase
    .from('reviews')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('[deleteReview]', error);
    throw error;
  }
  return deleted;
}

export async function getAverageRating(
  entityId: string,
  type: 'business' | 'product',
) {
  const supabase = await createServerSupabaseClient();
  const column = type === 'business' ? 'business_id' : 'product_id';
  const { data, error } = await supabase
    .from('reviews')
    .select('avg:avg(rating), count:count(*)', { count: 'exact' })
    .eq(column, entityId)
    .is('archived_at', null);

  if (error) {
    console.error('[getAverageRating]', error);
    return { average_rating: 0, review_count: 0 };
  }

  // Supabase returns aggregated fields differently; compute safely with typed access
  const row =
    Array.isArray(data) && data.length
      ? (data[0] as unknown as Record<string, unknown>)
      : null;
  const avgVal = row ? (row['avg'] ?? row['average_rating']) : 0;
  const cntVal = row ? (row['count'] ?? row['review_count']) : 0;

  return {
    average_rating: Number(avgVal ?? 0) || 0,
    review_count: Number(cntVal ?? 0) || 0,
  };
}

export async function getReviewById(
  id: string,
): Promise<{ data: Record<string, unknown> } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', id)
    .is('archived_at', null)
    .single();

  if (error) {
    console.error('[getReviewById]', error);
    return { error: 'Review not found' };
  }

  return { data: data as Record<string, unknown> };
}
