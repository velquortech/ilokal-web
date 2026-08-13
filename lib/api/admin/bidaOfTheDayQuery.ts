import { createServerSupabaseClient } from '@/supabase/server';

/**
 * Unify PostgREST embedded-relation shapes: without generated types, supabase-js
 * infers embedded relations as arrays even when the FK is to-one (PostgREST
 * returns an object at runtime for to-one). Reading through `first()` is safe
 * for both shapes.
 */
function first<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return v as T;
}

export type BidaPick = {
  id: string;
  pick_date: string;
  product_id: string;
  product_name: string;
  business_name: string;
  price: number | null;
  note: string | null;
};

export type BidaPickInput = {
  pick_date: string; // YYYY-MM-DD
  product_id: string;
  note?: string | null;
};

export type BidaProductResult = {
  product_id: string;
  product_name: string;
  business_name: string;
  price: number | null;
};

/**
 * List scheduled Bida of the Day picks, newest date first (past picks remain
 * visible so an admin can audit what the board showed; future picks are
 * pre-scheduled). The `bida_of_the_day` RPC consumes the most recent
 * `pick_date <= CURRENT_DATE`, so a future pick simply hasn't gone live yet.
 */
export async function listBidaPicks(limit = 90): Promise<BidaPick[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('bida_of_the_day')
    .select(
      'id, pick_date, note, product_id, products(name, price), businesses(shop_name)',
    )
    .order('pick_date', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const product = first<{ name: string; price: number | null }>(row.products);
    const business = first<{ shop_name: string }>(row.businesses);
    return {
      id: row.id as string,
      pick_date: row.pick_date as string,
      product_id: row.product_id as string,
      product_name: product?.name ?? 'Unknown product',
      business_name: business?.shop_name ?? 'Unknown business',
      price: product?.price ?? null,
      note: (row.note as string | null) ?? null,
    };
  });
}

/**
 * Upsert a pick (one row per `pick_date` — UNIQUE). The pick is validated
 * against what the `bida_of_the_day` RPC will actually resolve: the product
 * must exist, be active + available, and its business verified + not archived.
 * Picking anything else would silently resolve to `null` on the board (the
 * RPC filters those out), so the admin surface refuses up front.
 */
export async function upsertBidaPick(input: BidaPickInput): Promise<BidaPick> {
  const supabase = await createServerSupabaseClient();

  const { data: product, error: productError } = await supabase
    .from('products')
    .select(
      'id, name, price, status, is_available, archived_at, businesses(id, status, archived_at, shop_name)',
    )
    .eq('id', input.product_id)
    .single();

  if (productError || !product) {
    throw new Error('Product not found');
  }

  const business = first<{
    id: string;
    status: string;
    archived_at: string | null;
    shop_name: string;
  }>(product.businesses);
  const pickable =
    product.status === 'active' &&
    product.is_available === true &&
    product.archived_at == null &&
    business?.status === 'verified' &&
    business.archived_at == null;

  if (!pickable) {
    throw new Error(
      'This product is not pickable — it must be active/available and its business verified.',
    );
  }

  if (!business?.id) {
    throw new Error('Product has no owning business');
  }

  const { data, error } = await supabase
    .from('bida_of_the_day')
    .upsert(
      {
        pick_date: input.pick_date,
        business_id: business.id,
        product_id: input.product_id,
        note: input.note?.trim() ? input.note.trim() : null,
      },
      { onConflict: 'pick_date' },
    )
    .select('id, pick_date, note, product_id')
    .single();

  if (error) throw error;

  return {
    id: data.id as string,
    pick_date: data.pick_date as string,
    product_id: data.product_id as string,
    product_name: product.name as string,
    business_name: business?.shop_name ?? '',
    price: product.price as number | null,
    note: (data.note as string | null) ?? null,
  };
}

/**
 * Remove a pick for a date (the board falls back to the algorithmic hero
 * rotation / the next-most-recent pick for that day).
 */
export async function deleteBidaPick(pick_date: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('bida_of_the_day')
    .delete()
    .eq('pick_date', pick_date);

  if (error) throw error;
}

/**
 * Product picker search — matches the product name OR the owning business's
 * shop name (product names are often generic, e.g. "Signature Set 5", so the
 * business match is what makes the picker usable). Returns active/available
 * products of verified businesses, deduped by id.
 */
export async function searchBidaProducts(
  q: string,
  limit = 8,
): Promise<BidaProductResult[]> {
  const term = q.trim();
  if (!term) return [];

  const supabase = await createServerSupabaseClient();

  const [nameMatches, businessMatches] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price, businesses!business_id(shop_name)')
      .eq('status', 'active')
      .eq('is_available', true)
      .ilike('name', `%${term}%`)
      .limit(limit),
    // `!inner` is the PostgREST embedded-FILTER form — a bare
    // `businesses.shop_name` filter with a plain embed silently returns null
    // embeds and unfiltered rows (verified against the local PostgREST).
    supabase
      .from('products')
      .select('id, name, price, businesses!inner(shop_name)')
      .eq('status', 'active')
      .eq('is_available', true)
      .ilike('businesses.shop_name', `%${term}%`)
      .limit(limit),
  ]);

  if (nameMatches.error) throw nameMatches.error;
  if (businessMatches.error) throw businessMatches.error;

  const seen = new Set<string>();
  const results: BidaProductResult[] = [];
  for (const row of [
    ...(nameMatches.data ?? []),
    ...(businessMatches.data ?? []),
  ]) {
    const id = row.id as string;
    if (seen.has(id)) continue;
    seen.add(id);
    const business = first<{ shop_name: string }>(row.businesses);
    results.push({
      product_id: id,
      product_name: row.name as string,
      business_name: business?.shop_name ?? '',
      price: row.price as number | null,
    });
    if (results.length >= limit) break;
  }
  return results;
}
