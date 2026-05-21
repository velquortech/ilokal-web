/**
 * Product Query Layer
 * Handles all direct Supabase database operations for products and categories
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type {
  Product,
  Category,
  PaginatedProductsResponse,
  ProductFilters,
  CategoryFilters,
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
      products: (data || []) as typeof data,
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

    return { product: data };
  } catch (err) {
    console.error('[getProductById]', err);
    return { error: 'Failed to fetch product' as const };
  }
}

/**
 * Get all products for a business
 */
export async function getProductsByBusinessId(
  business_id: string,
  status?: string,
) {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('products')
      .select('*,category:category_id (id, name, slug)')
      .eq('business_id', business_id);

    if (status) {
      query = query.eq('status', status);
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
}

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

    return (data || []) as Product[];
  } catch (err) {
    console.error('[getProductsByCategory]', err);
    return null;
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
