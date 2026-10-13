import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  loggedServerError,
  notFoundResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { isValidResourceId } from '@/app/api/helpers/resourceId';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

const SORTS = new Set(['recent', 'highest', 'lowest']);
const MAX_PER_PAGE = 20;

/**
 * GET /api/mobile/businesses/:id/reviews?sort&page&per_page&with_comment
 *
 * Public, paginated review list. Reads through `get_business_reviews`
 * (SECURITY DEFINER) so the author's shaped display name ("Ana R.") resolves
 * for anonymous callers without exposing `profiles`. Only published reviews
 * exist in `business_ratings` — moderated ones live in their own table.
 *
 * `has_more` is computed by over-fetching one row, so no COUNT query is needed.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    if (!isValidResourceId(businessId)) {
      return notFoundResponse({ message: 'Business not found' });
    }
    const sp = req.nextUrl.searchParams;
    const sort = SORTS.has(sp.get('sort') ?? '') ? sp.get('sort')! : 'recent';
    const page = Math.max(1, Number.parseInt(sp.get('page') ?? '1', 10) || 1);
    const perPage = Math.min(
      MAX_PER_PAGE,
      Math.max(1, Number.parseInt(sp.get('per_page') ?? '10', 10) || 10),
    );
    const withComment = sp.get('with_comment') !== 'false';

    const supabase = createBearerClient();
    // Over-fetch one row to learn `has_more` (the RPC allows up to 21).
    const limit = perPage + 1;
    const { data, error } = await supabase.rpc('get_business_reviews', {
      p_business: businessId,
      p_sort: sort,
      p_limit: limit,
      p_offset: (page - 1) * perPage,
      p_with_comment: withComment,
    });
    if (error) {
      return loggedServerError('mobile/businesses/[businessId]/reviews', error);
    }

    const rows = (data ?? []) as Array<{
      id: string;
      rating: number;
      comment: string | null;
      created_at: string;
      edited: boolean;
      evidence: string;
      display_name: string;
      avatar_url: string | null;
    }>;
    const hasMore = rows.length > perPage;

    return successResponse({
      reviews: rows.slice(0, perPage).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        edited: r.edited,
        evidence: r.evidence,
        author: { display_name: r.display_name, avatar_url: r.avatar_url },
      })),
      page,
      per_page: perPage,
      has_more: hasMore,
    });
  } catch {
    return generalErrorResponse();
  }
}
