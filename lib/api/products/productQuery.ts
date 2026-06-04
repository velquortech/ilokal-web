/**
 * Product Query Layer
 * Handles all direct Supabase database operations for products and categories
 */

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
    const { page = 1, per_page = 10, search, sort_by = 'name_asc' } = filters;
    const offset = (page - 1) * per_page;

    const supabase = await createServerSupabaseClient();

    let query = supabase.from('categories').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
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
      return {
        categories: [] as Category[],
        total: 0,
        error: `Failed to fetch categories: ${error.message}` as const,
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
    console.error('[getCategoriesPaginated]', err);
    return {
      categories: [] as Category[],
      total: 0,
      error: 'Failed to fetch categories' as const,
    };
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
    console.error('[getCategoryById]', err);
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
    console.error('[getCategoryBySlug]', err);
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
      status = 'active',
      business_id,
      branch_id,
      sort_by = 'newest',
      min_price,
      max_price,
    } = filters;

    const offset = (page - 1) * per_page;
    const supabase = await createServerSupabaseClient();

    let query = supabase.from('products').select(
      `*,
        category:category_id (id, name, slug, description),
        business:business_id (id, shop_name)`,
      { count: 'exact' },
    );

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category_id) {
      query = query.eq('category_id', category_id);
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
      return { error: `Failed to fetch products: ${error.message}` };
    }

    return {
      products: ((data || []) as ProductResponse[]).map(normalizeProductSale),
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  } catch (err) {
    console.error('[getProductsPaginated]', err);
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
    console.error('[getProductById]', err);
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
      console.error('[getProductStatsByBusinessId]', err);
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
      console.error('[getProductsByBusinessId]', err);
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
    console.error('[getProductsByCategory]', err);
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

    if (error) return { error: `Failed to apply sale: ${error.message}` };
    return { product: updated };
  } catch (err) {
    console.error('[applySaleToProduct]', err);
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

    if (error) return { error: `Failed to remove sale: ${error.message}` };
    return { product: updated };
  } catch (err) {
    console.error('[removeSaleFromProduct]', err);
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

    if (error) return { total: 0, active: 0, inactive: 0, archived: 0 };

    const all = data || [];
    return {
      total: all.length,
      active: all.filter((p) => p.status === 'active').length,
      inactive: all.filter((p) => p.status === 'inactive').length,
      archived: all.filter((p) => p.status === 'archived').length,
    };
  } catch {
    return { total: 0, active: 0, inactive: 0, archived: 0 };
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
    console.error('[countProductsByBusiness]', err);
    return 0;
  }
}
