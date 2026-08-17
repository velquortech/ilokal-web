/**
 * Product Query Layer
 * Handles all direct Supabase database operations for products and categories
 */

import { formatErrorForLog } from '@/lib/utils/describeDbError';
import { cache } from 'react';
import { createServerSupabaseClient } from '@/supabase/server';
import { normalizeProductSale } from '@/lib/product-helper';
import type {
  Product,
  ProductResponse,
  Category,
  PaginatedProductsResponse,
  ProductFilters,
  CategoryFilters,
  ProductStats,
} from '@/lib/types';

// ===== Category Queries =====

/**
 * Get paginated categories with optional search
 */
export async function getCategoriesPaginated(filters: CategoryFilters) {
  try {
    const {
      page = 1,
      per_page = 10,
      search,
      sort_by = 'name_asc',
      business_type_id,
    } = filters;
    const offset = (page - 1) * per_page;

    const supabase = await createServerSupabaseClient();

    let query = supabase.from('categories').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    // "This vertical OR global". NULL is not an unset value here — it means
    // the category is offered everywhere, which is why an unmapped or renamed
    // row degrades to visible-everywhere instead of vanishing from every
    // picker. A salon stops being offered "Pastries"; it keeps "Health &
    // Beauty", which is global on purpose.
    if (business_type_id) {
      query = query.or(
        `business_type_id.eq.${business_type_id},business_type_id.is.null`,
      );
    }

    // Apply sorting
    if (sort_by === 'name_desc') {
      query = query.order('name', { ascending: false });
    } else if (sort_by === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort_by === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else {
      // name_asc (default)
      query = query.order('name', { ascending: true });
    }

    const { data, count, error } = await query.range(
      offset,
      offset + per_page - 1,
    );

    if (error) {
      // Never interpolate a driver message into a returned error: it names
      // tables, columns and constraints, and this value reaches a client
      // component. Log it server-side, return generic copy.
      console.error('[getCategoriesPaginated]', formatErrorForLog(error));
      return {
        categories: [] as Category[],
        total: 0,
        error: 'Failed to fetch categories' as const,
      };
    }

    return {
      categories: (data || []) as Category[],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  } catch (err) {
    console.error('[getCategoriesPaginated]', formatErrorForLog(err));
    return {
      categories: [] as Category[],
      total: 0,
      error: 'Failed to fetch categories' as const,
    };
  }
}

/**
 * Category-vertical divergence report for the catalogue page.
 *
 * The Add/Edit picker scopes categories to the business's vertical ("this
 * vertical OR global"), and `resolveCategoryInScope` enforces the same rule on
 * write. Existing rows can still diverge — legacy rows from before vertical
 * scoping, or a business whose vertical changed after its products were
 * categorized — and a divergent row silently mis-scopes the picker: the owner
 * sees a category on a row that the picker can never offer again, and a wrong
 * vertical (the GigaGrind incident) offers a list that fits nothing. This
 * guard makes that state visible instead of silent.
 */
export type CategoryDivergence = {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  /** The vertical the category belongs to (never global — globals can't diverge). */
  categoryBusinessTypeId: string;
  /** Its display name, when resolvable — the banner names the OTHER vertical. */
  categoryBusinessTypeName: string | null;
};

export type CategoryDivergenceReport = {
  /** The vertical the picker is scoped to. null = unscoped (every category shown). */
  businessTypeId: string | null;
  businessTypeName: string | null;
  /** Products categorized under a DIFFERENT vertical (or any, when unscoped). */
  divergent: CategoryDivergence[];
  /** The read failed — never render "all clear" from a broken query. */
  failed: boolean;
};

/**
 * Read the divergence for one business. Fails closed: `failed: true` on any
 * read error, so the guard can only hide the banner, never invent one.
 */
export async function getCategoryDivergence(
  businessId: string,
): Promise<CategoryDivergenceReport> {
  const failedReport = (partial: {
    businessTypeId: string | null;
    businessTypeName: string | null;
  }): CategoryDivergenceReport => ({
    ...partial,
    divergent: [],
    failed: true,
  });

  try {
    const supabase = await createServerSupabaseClient();

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('business_type_id')
      .eq('id', businessId)
      .maybeSingle();
    if (businessError) {
      console.error(
        '[getCategoryDivergence]',
        formatErrorForLog(businessError),
      );
      return failedReport({ businessTypeId: null, businessTypeName: null });
    }
    const businessTypeId = business?.business_type_id ?? null;

    let businessTypeName: string | null = null;
    if (businessTypeId) {
      const { data: type, error: typeError } = await supabase
        .from('business_types')
        .select('name')
        .eq('id', businessTypeId)
        .maybeSingle();
      if (typeError) {
        console.error('[getCategoryDivergence]', formatErrorForLog(typeError));
        return failedReport({ businessTypeId, businessTypeName: null });
      }
      businessTypeName = type?.name ?? null;
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, category:category_id (id, name, business_type_id)')
      .eq('business_id', businessId)
      .is('archived_at', null)
      .not('category_id', 'is', null);
    if (productsError) {
      console.error(
        '[getCategoryDivergence]',
        formatErrorForLog(productsError),
      );
      return failedReport({ businessTypeId, businessTypeName });
    }

    // The embedded to-one relation is inferred as an array by the generic
    // client — through `unknown`, matching the other embedded casts in this
    // file (businesses, sections).
    const rows = (products ?? []) as unknown as Array<{
      id: string;
      name: string;
      category: {
        id: string;
        name: string;
        business_type_id: string | null;
      } | null;
    }>;

    // Global categories (NULL vertical) are offered to every picker; only a
    // non-global category that belongs to a DIFFERENT vertical is out of
    // scope. A business with no vertical (fail-open picker) makes every
    // non-global category divergent — surfaced as the unscoped warning.
    const divergent: CategoryDivergence[] = rows.flatMap((row) => {
      const category = row.category;
      if (
        !category?.business_type_id ||
        category.business_type_id === businessTypeId
      ) {
        return [];
      }
      return [
        {
          productId: row.id,
          productName: row.name,
          categoryId: category.id,
          categoryName: category.name,
          categoryBusinessTypeId: category.business_type_id,
          categoryBusinessTypeName: null,
        },
      ];
    });

    // Name the OTHER vertical so the banner can say "categorized under X".
    const otherTypeIds = [
      ...new Set(divergent.map((d) => d.categoryBusinessTypeId)),
    ];
    if (otherTypeIds.length > 0) {
      const { data: types, error: typesError } = await supabase
        .from('business_types')
        .select('id, name')
        .in('id', otherTypeIds);
      if (typesError) {
        console.error('[getCategoryDivergence]', formatErrorForLog(typesError));
        return failedReport({ businessTypeId, businessTypeName });
      }
      const names = new Map(
        (types ?? []).map((t) => [t.id as string, t.name as string]),
      );
      for (const d of divergent) {
        d.categoryBusinessTypeName =
          names.get(d.categoryBusinessTypeId) ?? null;
      }
    }

    return { businessTypeId, businessTypeName, divergent, failed: false };
  } catch (err) {
    console.error('[getCategoryDivergence]', formatErrorForLog(err));
    return failedReport({ businessTypeId: null, businessTypeName: null });
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return null;
    }

    return data as Category;
  } catch (err) {
    console.error('[getCategoryById]', formatErrorForLog(err));
    return null;
  }
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(slug: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      return null;
    }

    return data as Category;
  } catch (err) {
    console.error('[getCategoryBySlug]', formatErrorForLog(err));
    return null;
  }
}

// ===== Product Queries =====

/**
 * Get paginated products with filters
 */
export async function getProductsPaginated(
  filters: ProductFilters,
): Promise<PaginatedProductsResponse | { error: string }> {
  try {
    const {
      page = 1,
      per_page = 10,
      search,
      category_id,
      section_id,
      status = 'active',
      business_id,
      branch_id,
      sort_by = 'newest',
      min_price,
      max_price,
    } = filters;

    const offset = (page - 1) * per_page;
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('products')
      .select(
        `*,
        category:category_id (id, name, slug, description),
        section:section_id (id, name),
        business:business_id (id, shop_name)`,
        { count: 'exact' },
      )
      .is('archived_at', null);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    // 'none' is the Uncategorised chip. Without it the products with no
    // section are reachable from no filter at all — which is how 85 rows
    // became invisible on this page.
    if (section_id === 'none') {
      query = query.is('section_id', null);
    } else if (section_id) {
      query = query.eq('section_id', section_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (business_id) {
      query = query.eq('business_id', business_id);
    }

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    if (min_price !== undefined) {
      query = query.gte('price', min_price);
    }

    if (max_price !== undefined) {
      query = query.lte('price', max_price);
    }

    // Apply sorting
    if (sort_by === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort_by === 'name_asc') {
      query = query.order('name', { ascending: true });
    } else if (sort_by === 'name_desc') {
      query = query.order('name', { ascending: false });
    } else if (sort_by === 'price_low') {
      query = query.order('price', { ascending: true });
    } else if (sort_by === 'price_high') {
      query = query.order('price', { ascending: false });
    } else {
      // newest (default)
      query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(
      offset,
      offset + per_page - 1,
    );

    if (error) {
      console.error('[getProductsPaginated]', formatErrorForLog(error));
      return { error: 'Failed to fetch products' };
    }

    return {
      products: ((data || []) as ProductResponse[]).map(normalizeProductSale),
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  } catch (err) {
    console.error('[getProductsPaginated]', formatErrorForLog(err));
    return { error: 'Failed to fetch products' };
  }
}

/**
 * Get single product by ID
 */
export async function getProductById(id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('products')
      .select(
        `*,
        category:category_id (id, name, slug),
        business:business_id (id, shop_name)`,
      )
      .eq('id', id)
      .single();

    if (error) {
      return { error: 'Product not found' as const };
    }

    return { product: normalizeProductSale(data as ProductResponse) };
  } catch (err) {
    console.error('[getProductById]', formatErrorForLog(err));
    return { error: 'Failed to fetch product' as const };
  }
}

/**
 * Get per-status product counts for a business (for the stats bar).
 * Wrapped with React cache() so parallel server component reads share one DB call.
 */
export const getProductStatsByBusinessId = cache(
  async (business_id: string, branch_id?: string): Promise<ProductStats> => {
    try {
      const supabase = await createServerSupabaseClient();

      let statsQuery = supabase
        .from('products')
        .select('status, sale_price')
        .eq('business_id', business_id)
        .is('archived_at', null);

      if (branch_id) {
        statsQuery = statsQuery.eq('branch_id', branch_id);
      }

      const { data, error } = await statsQuery;

      if (error || !data) {
        return { total: 0, active: 0, unlisted: 0, disabled: 0, on_sale: 0 };
      }

      return {
        total: data.length,
        active: data.filter((p) => p.status === 'active').length,
        unlisted: data.filter((p) => p.status === 'unlisted').length,
        disabled: data.filter((p) => p.status === 'disabled').length,
        on_sale: data.filter((p) => p.sale_price != null).length,
      };
    } catch (err) {
      console.error('[getProductStatsByBusinessId]', formatErrorForLog(err));
      return { total: 0, active: 0, unlisted: 0, disabled: 0, on_sale: 0 };
    }
  },
);

/**
 * Get all products for a business, optionally scoped to a branch.
 * When branch_id is provided, returns only products assigned to that specific branch.
 * Wrapped with React cache() so parallel server component reads share one DB call.
 */
export const getProductsByBusinessId = cache(
  async (business_id: string, status?: string, branch_id?: string) => {
    try {
      const supabase = await createServerSupabaseClient();

      let query = supabase
        .from('products')
        .select('*,category:category_id (id, name, slug, description)')
        .eq('business_id', business_id)
        .is('archived_at', null);

      if (status) {
        query = query.eq('status', status);
      }

      if (branch_id) {
        query = query.eq('branch_id', branch_id);
      }

      const { data, error } = await query.order('created_at', {
        ascending: false,
      });

      if (error) {
        return { error: 'Failed to fetch business products' as const };
      }

      return { products: (data || []) as typeof data };
    } catch (err) {
      console.error('[getProductsByBusinessId]', formatErrorForLog(err));
      return { error: 'Failed to fetch business products' as const };
    }
  },
);

/**
 * Get products by category
 */
export async function getProductsByCategory(category_id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', category_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      return null;
    }

    return ((data || []) as Product[]).map(normalizeProductSale);
  } catch (err) {
    console.error('[getProductsByCategory]', formatErrorForLog(err));
    return null;
  }
}

/**
 * Apply a sale price to a product.
 * Reusable: called from service layer and can be used by admin or mobile routes.
 */
export async function applySaleToProduct(
  id: string,
  data: {
    sale_price: number;
    sale_starts_at?: string | null;
    sale_ends_at?: string | null;
  },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: updated, error } = await supabase
      .from('products')
      .update({
        sale_price: data.sale_price,
        sale_starts_at: data.sale_starts_at ?? null,
        sale_ends_at: data.sale_ends_at ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[applySaleToProduct]', formatErrorForLog(error));
      return { error: 'Failed to apply sale' };
    }
    return { product: updated };
  } catch (err) {
    console.error('[applySaleToProduct]', formatErrorForLog(err));
    return { error: 'Failed to apply sale' };
  }
}

/**
 * Remove an active sale from a product.
 * Reusable: called from service layer and can be used by admin or mobile routes.
 */
export async function removeSaleFromProduct(id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: updated, error } = await supabase
      .from('products')
      .update({
        sale_price: null,
        sale_starts_at: null,
        sale_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[removeSaleFromProduct]', formatErrorForLog(error));
      return { error: 'Failed to remove sale' };
    }
    return { product: updated };
  } catch (err) {
    console.error('[removeSaleFromProduct]', formatErrorForLog(err));
    return { error: 'Failed to remove sale' };
  }
}

/**
 * Get product status counts for a business (used by stats panel)
 */
export async function getProductStatsByBusiness(business_id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('status')
      .eq('business_id', business_id);

    // NOTE (pre-existing, fixed here because it blocked typecheck): this
    // counted 'inactive' and 'archived', which are not values `products.status`
    // can hold — the CHECK is active|unlisted|disabled (20260526000013). Both
    // buckets were therefore ALWAYS zero wherever this was rendered.
    if (error) return { total: 0, active: 0, unlisted: 0, disabled: 0 };

    const all = data || [];
    return {
      total: all.length,
      active: all.filter((p) => p.status === 'active').length,
      unlisted: all.filter((p) => p.status === 'unlisted').length,
      disabled: all.filter((p) => p.status === 'disabled').length,
    };
  } catch {
    return { total: 0, active: 0, unlisted: 0, disabled: 0 };
  }
}

/**
 * Count products by business
 */
export async function countProductsByBusiness(business_id: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business_id);

    if (error) {
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('[countProductsByBusiness]', formatErrorForLog(err));
    return 0;
  }
}
