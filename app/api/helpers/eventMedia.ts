import { resolveStorageUrl } from '@/app/api/helpers/storage';

/**
 * The two things every event read has to do to a row before anything renders
 * it, in one place.
 *
 * Both were spelled out twice — once in `lib/api/events/eventQuery.ts` for the
 * web surfaces and once in `app/api/helpers/mobileEvent.ts` for the mobile
 * routes — which is the fork CLAUDE.md §DRY asks to be widened rather than
 * copied. The bucket names in particular are the kind of literal that has to
 * exist once: a typo in one copy resolves to a 404 image on half the app.
 *
 * What is NOT here is policy. Which rows are visible, and which embedded
 * offering a given audience may see, differ per surface — so those decisions
 * stay with the caller and only the mechanics are shared.
 */

export type StorageClient = Parameters<typeof resolveStorageUrl>[0];

/**
 * PostgREST returns a to-one embed as an ARRAY. Reading `.shop_name` off it
 * yields `undefined`, which renders as a shop with no name — so every read
 * unwraps first.
 */
export function firstOrNull<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

/** An event row as PostgREST hands it back, before the embeds are unwrapped. */
export interface EventMediaSource {
  image_url?: string | null;
  business?: unknown;
  product?: unknown;
}

export interface ResolvedEventMedia<B, P> {
  image_url: string | null;
  business: B | null;
  product: P | null;
}

/**
 * Unwrap the two to-one embeds and resolve every stored image path to a URL.
 *
 * The resolution is not optional. `uploadWebP` returns `data.path`, so a real
 * upload stores `<businessId>/<file>.webp`; handing that to a client yields a
 * broken image. Seeds store full URLs instead, and `resolveStorageUrl` passes
 * those through untouched — so one call covers both.
 */
export function resolveEventMedia<
  B extends { logo_url: string | null },
  P extends { image_url: string | null },
>(supabase: StorageClient, row: EventMediaSource): ResolvedEventMedia<B, P> {
  const business = firstOrNull<B>(row.business);
  const product = firstOrNull<P>(row.product);

  return {
    image_url: resolveStorageUrl(
      supabase,
      'event-images',
      row.image_url ?? null,
    ),
    business: business
      ? {
          ...business,
          logo_url: resolveStorageUrl(
            supabase,
            'shop-logos',
            business.logo_url,
          ),
        }
      : null,
    product: product
      ? {
          ...product,
          image_url: resolveStorageUrl(
            supabase,
            'product-images',
            product.image_url,
          ),
        }
      : null,
  };
}
