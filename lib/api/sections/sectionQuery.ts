/**
 * Shop-section reads.
 *
 * Counts come from the `section_product_counts` RPC rather than a JS reduce:
 * PostgREST caps a response at 1000 rows, so counting in Node silently reports
 * the wrong number for any shop past that — the failure mode the 2026-07-17
 * audit found four times over. The RPC is SECURITY INVOKER, so RLS decides
 * what each caller may count.
 */

import { createServerSupabaseClient } from '@/supabase/server';
import type { ProductSection, ProductSectionWithCount } from '@/lib/types';

/** Rows the counts RPC returns; a NULL id is the Uncategorised bucket. */
type CountRow = { section_id: string | null; product_count: number };

export type SectionListResult = {
  sections: ProductSectionWithCount[];
  /** Live products with no section. Rendered as "Uncategorised". */
  uncategorised_count: number;
  /**
   * The counts RPC failed, so every `product_count` here is a placeholder
   * zero. Callers MUST NOT read those zeroes as "empty" — the archive
   * confirmation used to say "this section is empty, so nothing else changes"
   * on the strength of them, which is a lie told just before moving real
   * offerings to Uncategorised.
   */
  counts_failed?: boolean;
  error?: 'LOAD_FAILED';
};

const EMPTY: SectionListResult = { sections: [], uncategorised_count: 0 };

/**
 * A shop's live sections in the owner's order, each with its product count.
 *
 * Never throws: this feeds a dashboard panel, and a failed read should render
 * as "couldn't load" rather than take the catalogue page down with it.
 */
export async function getSectionsWithCounts(
  businessId: string,
  /**
   * Scope the counts to one branch. The catalogue table is branch-filterable,
   * and shop-wide chip counts beside a branch-filtered table are two different
   * numbers describing the same thing.
   */
  branchId?: string,
): Promise<SectionListResult> {
  if (!businessId) return EMPTY;

  try {
    const supabase = await createServerSupabaseClient();

    const [sectionsRes, countsRes] = await Promise.all([
      supabase
        .from('product_sections')
        .select('*')
        .eq('business_id', businessId)
        .is('archived_at', null)
        .order('position', { ascending: true })
        // Deterministic tie-break: two sections may share a position while an
        // owner is reordering, and a list that reshuffles between renders is
        // its own bug.
        .order('created_at', { ascending: true }),
      supabase.rpc('section_product_counts', {
        p_business_id: businessId,
        p_branch_id: branchId ?? undefined,
      }),
    ]);

    if (sectionsRes.error) {
      console.error('[getSectionsWithCounts sections]', sectionsRes.error);
      return { ...EMPTY, error: 'LOAD_FAILED' };
    }

    // If only the RPC fails, still show the names — but say the counts are
    // unknown rather than letting placeholder zeroes speak.
    const countsFailed = !!countsRes.error;
    if (countsRes.error) {
      console.error('[getSectionsWithCounts counts]', countsRes.error);
    }

    const counts = new Map<string | null, number>();
    for (const row of (countsRes.data ?? []) as CountRow[]) {
      counts.set(row.section_id, Number(row.product_count) || 0);
    }

    const sections = ((sectionsRes.data ?? []) as ProductSection[]).map(
      (section) => ({
        ...section,
        product_count: counts.get(section.id) ?? 0,
      }),
    );

    return {
      sections,
      uncategorised_count: counts.get(null) ?? 0,
      ...(countsFailed && { counts_failed: true }),
    };
  } catch (err) {
    console.error('[getSectionsWithCounts]', err);
    return { ...EMPTY, error: 'LOAD_FAILED' };
  }
}

/**
 * Names and order only — no counts.
 *
 * The public shop page groups by section and renders no numbers, so paying for
 * the aggregate RPC there is a per-request cost on the highest-traffic
 * anonymous route for data nobody sees.
 */
export async function getSectionsForDisplay(
  businessId: string,
): Promise<Pick<ProductSection, 'id' | 'name' | 'position'>[]> {
  if (!businessId) return [];
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('product_sections')
      .select('id, name, position')
      .eq('business_id', businessId)
      .is('archived_at', null)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[getSectionsForDisplay]', error);
      return [];
    }
    return (data ?? []) as Pick<ProductSection, 'id' | 'name' | 'position'>[];
  } catch (err) {
    console.error('[getSectionsForDisplay]', err);
    return [];
  }
}

/**
 * Does this section belong to this shop, and is it still live?
 *
 * The FK on `products.section_id` only proves the section EXISTS — nothing in
 * the database stops an owner attaching one of another shop's section ids to
 * their own product, which would leak that shop's naming onto a public page.
 * Every write path that accepts a `section_id` must call this first.
 */
export async function sectionBelongsToBusiness(
  sectionId: string,
  businessId: string,
): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('product_sections')
      .select('id')
      .eq('id', sectionId)
      .eq('business_id', businessId)
      .is('archived_at', null)
      .maybeSingle();

    if (error) {
      console.error('[sectionBelongsToBusiness]', error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error('[sectionBelongsToBusiness]', err);
    return false;
  }
}
