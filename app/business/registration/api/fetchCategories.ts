import {
  Coffee,
  Store,
  Scissors,
  Plane,
  Clapperboard,
  HeartPulse,
  GraduationCap,
  Hammer,
  LucideIcon,
} from 'lucide-react';

export const iconMap: Record<string, LucideIcon> = {
  Coffee,
  Store,
  Scissors,
  Plane,
  Clapperboard,
  HeartPulse,
  GraduationCap,
  Hammer,
};

export type BusinessCategory = {
  id: string;
  name: string;
  description: string;
  imageURL: string;
};

export type BusinessType = {
  name: string;
  description: string;
  icon: LucideIcon;
  items: BusinessCategory[];
  /**
   * The vertical's `offering_profile` JSONB, carried through untransformed.
   *
   * `unknown` on purpose: it is admin-editable JSONB, so the DB guarantees
   * nothing about its shape — `resolveOfferingVocabulary` is built to take
   * exactly that and degrade per field. Needed here because the menu step has
   * to name the shop's offerings ("Service Menu", "Packages") before a
   * `businesses` row exists to read the vocabulary from.
   */
  offeringProfile: unknown;
};

export type RawBusinessCategory = {
  id: string;
  name: string;
  /**
   * NULLABLE in the database — `business_categories.description` is `text NULL`,
   * and `POST /api/web/business-categories` passes its body to the service with
   * NO Zod validation — so a row with no description is one admin action away.
   * Declared honestly here and normalised to `''` in `transformBusinessTypes`,
   * which is what lets `BusinessCategory.description` stay a plain `string`.
   */
  description: string | null;
  /**
   * ALSO nullable in the database, and deliberately NOT normalised below.
   * `''` is not a safe fallback: `ShopCategoryStep` renders this straight into
   * `<Image src={item.imageURL} />`, and next/image throws on an empty src the
   * same way it throws on null — it would trade one crash for another. The real
   * fix is a placeholder tile in the card component, which is a change to a
   * wizard step with its own QA (recorded in CLAUDE.md). Left as-is so the
   * existing behaviour is unchanged.
   */
  image_url: string;
};

export type RawBusinessType = {
  name: string;
  description: string;
  icon: string;
  offering_profile?: unknown;
  business_categories: RawBusinessCategory[];
};

export function transformBusinessTypes(raw: RawBusinessType[]): BusinessType[] {
  return raw.map((type) => ({
    name: type.name,
    description: type.description,
    icon: iconMap[type.icon] ?? Coffee,
    offeringProfile: type.offering_profile ?? null,
    items: type.business_categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      // `?? ''` is load-bearing, not defensive noise: the category search
      // calls `.toLowerCase()` on this while the owner types, so a single NULL
      // row would throw on the first keystroke and take the whole step down.
      // Normalising at the boundary fixes it for every consumer at once
      // instead of leaving each call site to remember the guard.
      description: cat.description ?? '',
      imageURL: cat.image_url,
    })),
  }));
}

/**
 * The vertical that owns a given shop-type id.
 *
 * The wizard stores only `business_category.id` (the SHOP type), but the
 * vocabulary and the offering mode both hang off its VERTICAL. Returns
 * undefined for a custom category — one the owner typed rather than picked —
 * which has no vertical at all and must fall back to the default vocabulary.
 */
export function findVerticalForCategoryId(
  businessTypes: BusinessType[],
  categoryId: string | undefined,
): BusinessType | undefined {
  if (!categoryId) return undefined;
  return businessTypes.find((type) =>
    type.items.some((item) => item.id === categoryId),
  );
}
