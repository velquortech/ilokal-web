/**
 * Shop gallery rules, in a module with **no dependencies**.
 *
 * Split out of `lib/validation/business.ts` for the reason `data/stepMeta.ts`
 * was split out of `steps.tsx`: three client components need two integers and a
 * predicate, and importing them from a module whose top level constructs Zod
 * schemas drags Zod into those bundles for no benefit. The validation file
 * re-exports these, so no call site had to change.
 */

/**
 * Gallery ceiling — the ONE place this number lives.
 *
 * Read by the Zod schema, by `GalleryUploader`'s add tile, and by the copy on
 * the gallery page. A second literal is how the form starts refusing an
 * eleventh photo the server would have accepted, or the reverse.
 *
 * Enforced on GROWTH, never as a flat ceiling: nothing caps the gallery at
 * upload time — registration requires **at least** four interior photos and
 * `/api/web/upload/business-interior` appends without a limit — so a shop that
 * registered with eleven photos would have every write rejected by a flat cap,
 * **including the removals that would bring it back under**.
 */
export const MAX_GALLERY_IMAGES = 10;

/**
 * How many photos the shop page needs before it renders the full masonry
 * layout — `Masonry` hard-returns below this and `ShopGallery` falls back to a
 * plain 3-up grid. Stated on the gallery page because an owner with three
 * photos otherwise cannot tell why their shop page looks different.
 */
export const MASONRY_MIN_IMAGES = 4;

export const GALLERY_BUCKET = 'interior-images';

/**
 * Is this gallery entry a file inside THIS shop's own folder?
 *
 * 🔴 The assumption that a client-supplied storage key is safe is what this
 * closes. `extractStoragePath` returns any non-`http` string verbatim and
 * blindly slices whatever follows the bucket marker, so
 * `…/interior-images/<otherShopId>/x.webp` or
 * `…/interior-images/../shop-logos/x.webp` would be stored as sent and then
 * handed to `storage.remove()`. The bucket's DELETE policy is the only other
 * backstop and it does **not** stop an owner who holds two shops from deleting
 * shop B's file through shop A's gallery.
 *
 * Every real writer produces `<businessId>/<filename>` — registration
 * (`business.ts`), the upload route, and `seed-storage.sh` — so exactly one
 * prefix segment and one filename is the whole legitimate shape. A foreign host
 * fails this too: it normalises to itself verbatim and does not start with the
 * id.
 *
 * Compared case-insensitively: `verifyBusinessOwner`'s UUID check is `/i` and
 * Postgres compares `uuid` case-insensitively, so an owner who reaches
 * `/business/<UPPERCASE-UUID>/…` uploads to an uppercase folder and must still
 * be able to save it.
 */
export function isOwnGalleryPath(path: string, businessId: string): boolean {
  const segments = path.split('/');
  if (segments.length !== 2) return false;
  const [prefix, filename] = segments;
  return (
    prefix.toLowerCase() === businessId.toLowerCase() &&
    !!filename &&
    filename !== '.' &&
    filename !== '..'
  );
}

/**
 * Entries a caller must not be allowed to introduce — the offenders, so the
 * error can name one.
 *
 * 🔴 Grandfathers what the row ALREADY holds, and that is the whole design.
 * Requiring the shape of every entry would lock the gallery page out of any row
 * that does not already conform — the 40 shops in `bulk_seed.sql` reuse other
 * shops' interior paths, and the sample data in `mobile-api.md` stores foreign
 * picsum URLs. Those owners would have **every** save refused, including the
 * removal that would fix it, which is the same dead end the flat cap created.
 *
 * A client still cannot inject a key: anything not already in the row must be
 * this shop's own.
 */
export function foreignGalleryPaths(
  next: readonly string[],
  current: readonly string[],
  businessId: string,
): string[] {
  const existing = new Set(current);
  return next.filter(
    (path) => !existing.has(path) && !isOwnGalleryPath(path, businessId),
  );
}
