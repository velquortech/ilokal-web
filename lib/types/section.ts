/**
 * Shop sections — the owner-editable grouping of a single shop's offerings.
 *
 * Deliberately NOT `Category`. `categories` is the platform taxonomy (admin
 * -curated, used by explore filters, facets and SEO); a section is one shop's
 * own menu heading. A product carries both. See `.claude/CATALOGUES.md` and
 * migration `20260801061117`.
 */

export interface ProductSection {
  id: string;
  business_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/** A section plus its live product count (from `section_product_counts`). */
export interface ProductSectionWithCount extends ProductSection {
  product_count: number;
}

export interface CreateSectionRequest {
  name: string;
}

export interface UpdateSectionRequest {
  name?: string;
  position?: number;
}

/** Max live sections per shop — mirrors the DB cap trigger (IL003). */
export const MAX_SECTIONS_PER_SHOP = 30;

/** Max section name length — mirrors the DB CHECK. */
export const MAX_SECTION_NAME_LENGTH = 40;
