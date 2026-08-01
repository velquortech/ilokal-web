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
      supabase.rpc('section_product_counts', { p_business_id: businessId }),
    ]);

    if (sectionsRes.error) {
      console.error('[getSectionsWithCounts sections]', sectionsRes.error);
      return { ...EMPTY, error: 'LOAD_FAILED' };
    }

    // Counts are decorative next to the names: if only the RPC fails, show the
    // sections with zeroes rather than an error panel.
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
    };
  } catch (err) {
    console.error('[getSectionsWithCounts]', err);
    return { ...EMPTY, error: 'LOAD_FAILED' };
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
