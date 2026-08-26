import {
  Coffee,
  Store,
  Scissors,
  Plane,
  Clapperboard,
  HeartPulse,
  GraduationCap,
  Hammer,
  Dumbbell,
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
  Dumbbell,
};

export type BusinessCategory = {
  id: string;
  name: string;
  description: string;
  /**
   * NULL when the category has no image. `business_categories.image_url` is
   * nullable, so this must be too — typing it `string` is what let a NULL
   * reach `<Image src={...} />` and crash the whole registration step.
   * `CategoryCard` renders a fallback tile instead; see ShopCategoryStep.
   */
  imageURL: string | null;
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
   * NULLABLE in the database, and deliberately NOT normalised to `''` below.
   * An empty string is not a safe fallback — next/image throws on an empty
   * `src` exactly as it throws on null, so coercing here would trade one crash
   * for another. The nullability is carried through to `BusinessCategory` and
   * handled where it can actually be handled: `CategoryCard` renders a
   * placeholder tile when there is no image.
   */
  image_url: string | null;
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
      // Deliberately NOT `?? ''` — see the note on `image_url` above. A blank
      // string is as fatal to next/image as a null, so the null is preserved
      // and the card branches on it.
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
