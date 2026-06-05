import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    const { searchParams } = req.nextUrl;

    const search = searchParams.get('q')?.trim();
    // Page-based browse (mobile products/menu screen). When `page` is absent the
    // response keeps the legacy single-batch shape (`{ products }`) used by the
    // detail "must-try" preview and the home popular-products scan.
    const pageParam = searchParams.get('page');
    const paginated = pageParam != null;
    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const perPageRaw = parseInt(searchParams.get('per_page') ?? '12', 10);
    const perPage = Math.min(
      50,
      Math.max(1, Number.isFinite(perPageRaw) ? perPageRaw : 12),
    );
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const sort = searchParams.get('sort') ?? (paginated ? 'popular' : 'name');

    const supabase = createBearerClient();

    // The set-returning RPC behaves as a relation, so search / ordering / range
    // pagination apply on top without a function change (mirrors nearby).
    let query = supabase.rpc(
      'business_products',
      { p_business_id: businessId },
      paginated ? { count: 'exact' } : {},
    );

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Mobile sort key → PostgREST ordering on the RPC's aggregate columns.
    // `popular` is the menu default; `name` backs the legacy non-paginated batch.
    const desc = { ascending: false, nullsFirst: false } as const;
    const asc = { ascending: true, nullsFirst: false } as const;
    switch (sort) {
      case 'price_asc':
        query = query.order('price', asc);
        break;
      case 'price_desc':
        query = query.order('price', desc);
        break;
      case 'rating':
        // avg first, then volume as the tie-breaker.
        query = query.order('average_rating', desc).order('rating_count', desc);
        break;
      case 'name':
        query = query.order('name', asc);
        break;
      case 'popular':
      default:
        query = query.order('popularity', desc);
        break;
    }
    // Stable secondary ordering so equal sort keys don't reshuffle across pages
    // (skip when name is already the primary key).
    if (sort !== 'name') {
      query = query.order('name', { ascending: true });
    }

    if (paginated) {
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      return generalErrorResponse({ message: error.message });
    }

    const products = (data ?? []).map((product: Record<string, unknown>) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      sale_price: product.sale_price ?? null,
      price_type: product.price_type as string,
      price_unit: product.price_unit as string | null,
      image_url: resolveStorageUrl(
        supabase,
        'product-images',
        product.image_url as string | null,
      ),
      is_available: product.is_available,
      category: product.category ?? null,
      average_rating:
        product.average_rating != null ? Number(product.average_rating) : 0,
      rating_count: Number(product.rating_count ?? 0),
    }));

    if (paginated) {
      const total = count ?? 0;
      return successResponse({
        products,
        has_more: from + products.length < total,
        total,
      });
    }

    return successResponse({ products });
  } catch {
    return generalErrorResponse();
  }
}
