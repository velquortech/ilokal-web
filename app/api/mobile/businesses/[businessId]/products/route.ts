import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  successResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { formatOfferingPrice } from '@/lib/utils/formatOfferingPrice';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    const { searchParams } = req.nextUrl;

    const search = searchParams.get('q')?.trim();
    const category = searchParams.get('category')?.trim(); // category slug
    const num = (key: string): number | null => {
      const n = parseFloat(searchParams.get(key) ?? '');
      return Number.isFinite(n) ? n : null;
    };
    const priceMin = num('price_min');
    const priceMax = num('price_max');
    const minRating = num('min_rating');
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
      // Strip the chars PostgREST uses as `.or()` delimiters so a stray
      // comma/paren can't inject extra filter conditions (mirrors nearby route).
      const s = search.replace(/[,()]/g, ' ').trim();
      if (s) {
        query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
      }
    }

    // Filter by product category (slug) — the RPC returns `category` as JSONB,
    // so match on its `slug` key.
    if (category) {
      query = query.eq('category->>slug', category);
    }

    // Price range (on base price) + minimum average rating — both filter on the
    // RPC's projected columns, mirroring the category filter.
    // Quote-based offerings (`price_type='on_request'`, NULL price) can't
    // satisfy a numeric bound — PostgREST would drop them silently, which
    // reads as "this shop has no packages" rather than "none in that range".
    // Excluding them explicitly keeps the omission intentional and documented.
    if (priceMin != null) query = query.gte('price', priceMin);
    if (priceMax != null) query = query.lte('price', priceMax);
    if (minRating != null) query = query.gte('average_rating', minRating);

    // Mobile sort key → PostgREST ordering on the RPC's aggregate columns.
    // `popular` is the menu default; `name` backs the legacy non-paginated batch.
    // `nullsFirst: false` in BOTH directions: quote-based offerings have a
    // NULL price and Postgres defaults to NULLS FIRST on DESC, which would put
    // every "price on request" item at the top of a price-high sort.
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
      return loggedServerError(
        'mobile/businesses/[businessId]/products',
        error,
      );
    }

    const products = (data ?? []).map((product: Record<string, unknown>) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      sale_price: product.sale_price ?? null,
      price_type: product.price_type as string,
      price_unit: product.price_unit as string | null,
      // Server-rendered display copy. Additive field (old clients ignore
      // unknown keys) so a per-hour service / per-day rental reads correctly
      // without waiting on an APK release — `price` keeps its exact current
      // shape and meaning. See .claude/OFFERINGS_MODEL.md (D6, G1).
      price_display: formatOfferingPrice({
        price: product.price as number | null,
        price_type: product.price_type as string | null,
        price_unit: product.price_unit as string | null,
      }),
      image_url: resolveStorageUrl(
        supabase,
        'product-images',
        product.image_url as string | null,
      ),
      is_available: product.is_available,
      // Offering discriminators + service/rental attributes. All additive —
      // old clients ignore unknown keys (OFFERINGS_MODEL D6).
      kind: (product.kind as string) ?? 'product',
      booking_mode: (product.booking_mode as string) ?? 'none',
      duration_minutes: (product.duration_minutes as number | null) ?? null,
      lead_time_minutes: (product.lead_time_minutes as number | null) ?? null,
      inventory_count: (product.inventory_count as number | null) ?? null,
      capacity: (product.capacity as number | null) ?? null,
      deposit_amount:
        product.deposit_amount != null ? Number(product.deposit_amount) : null,
      min_duration_units: (product.min_duration_units as number | null) ?? null,
      max_duration_units: (product.max_duration_units as number | null) ?? null,
      service_location: (product.service_location as string) ?? 'at_business',
      category: product.category ?? null,
      average_rating:
        product.average_rating != null ? Number(product.average_rating) : 0,
      rating_count: Number(product.rating_count ?? 0),
      weekly_view_count: Number(product.weekly_view_count ?? 0),
    }));

    if (paginated) {
      const total = count ?? 0;
      // Surface the business's full category list on page 1 (one extra cheap
      // call, not repeated while paging) so the client can build the filter.
      let categories: { id: string; name: string; slug: string }[] = [];
      if (page === 1) {
        const { data: catData } = await supabase.rpc(
          'business_product_categories',
          { p_business_id: businessId },
        );
        categories = (catData ?? []) as typeof categories;
      }
      return successResponse({
        products,
        has_more: from + products.length < total,
        total,
        categories,
      });
    }

    return successResponse({ products });
  } catch {
    return generalErrorResponse();
  }
}
