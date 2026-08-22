-- Repair: storage paths stored percent-ENCODED, and one path in the wrong bucket.
--
-- ⚠️ NOT RUN BY ANY MIGRATION. Blocks 2 and 3 are production `UPDATE`s and want
--    a human. Block 1 is read-only and safe to run any time.
--
-- WHY THESE ROWS EXIST
--   `extractStoragePath` used to slice a Supabase public url as a plain string
--   and store the remainder as if it were a path — so `%20` (a space in the
--   url) was written into the database as a literal three-character sequence.
--   `storage.getPublicUrl()` then runs `encodeURI()` over the whole url it
--   builds, and `encodeURI('%20')` is `'%2520'`, so every read produced a url
--   that 400s. Verified against the live bucket:
--
--     …/1786278978809-Screenshot%202026-08-08%20095928.webp    → 200
--     …/1786278978809-Screenshot%25202026-08-08%2520095928.webp → 400
--
--   The read path now normalises the value (`decodeStoragePath` in
--   `lib/utils/storage.ts`), so these rows ALREADY RENDER without this script.
--   Running it is hygiene: it removes the ambiguity rather than relying on a
--   read-time repair, and it makes `storagePathsToDelete` compare the same
--   strings the bucket holds. See `.claude/SENTRY_TRIAGE_2.md` (IM1, IM4).
--
-- ROLLBACK
--   Block 2 is a pure `replace('%20',' ')`. To undo, run the inverse over the
--   same 4 rows. Take the audit output of block 1 first — that IS the backup.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. AUDIT (read-only). Every stored image value that is percent-encoded, or
--    that names an object no bucket actually holds.
-- ────────────────────────────────────────────────────────────────────────────
with img as (
  select b.id, b.shop_name, i.ord, i.val
  from businesses b,
       unnest(b.interior_images) with ordinality as i(val, ord)
  where b.archived_at is null
)
select
  i.shop_name,
  i.ord,
  i.val,
  (i.val ~ '%[0-9A-Fa-f]{2}')                                  as percent_encoded,
  exists (
    select 1 from storage.objects o
    where o.bucket_id = 'interior-images' and o.name = i.val
  )                                                            as resolves_today,
  (
    select o.bucket_id from storage.objects o
    where o.name = replace(i.val, '%20', ' ') limit 1
  )                                                            as decoded_lives_in
from img i
where i.val ~ '%[0-9A-Fa-f]{2}'
   or not exists (
        select 1 from storage.objects o
        where o.bucket_id = 'interior-images' and o.name = i.val
      )
order by i.shop_name, i.ord;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. REPAIR the encoded gallery paths (4 rows on JV PEST CONTROL SERVICES as of
--    2026-08-22). Only `%20` is rewritten, and only where the DECODED name is
--    an object that actually exists — so a value we have not proven is left
--    alone rather than guessed at.
--
--    Wrapped so it can be inspected before committing:
--      BEGIN; <statement>; <re-run block 1>; COMMIT;  -- or ROLLBACK;
-- ────────────────────────────────────────────────────────────────────────────
-- BEGIN;
-- update businesses b
--    set interior_images = (
--          select array_agg(
--                   case
--                     when exists (
--                            select 1 from storage.objects o
--                            where o.bucket_id = 'interior-images'
--                              and o.name = replace(i.val, '%20', ' ')
--                          )
--                     then replace(i.val, '%20', ' ')
--                     else i.val
--                   end
--                   order by i.ord)
--            from unnest(b.interior_images) with ordinality as i(val, ord)
--        )
--  where b.archived_at is null
--    and exists (
--          select 1 from unnest(b.interior_images) as v(val)
--          where v.val like '%\%20%'
--        );
-- COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Gugma Salon & Spa: `c4dd50b9…/banner.webp` sits in `interior_images`, but
--    that object lives in `shop-banners`. Resolved against `interior-images` it
--    is a 404 however it is spelled, so no amount of code fixes it.
--
--    🔴 NOT written as a statement on purpose — there are two valid answers and
--    the choice is not ours:
--      (a) drop the entry (the shop's gallery loses a photo it never had), or
--      (b) copy the object into `interior-images` and repoint it (the banner
--          appears twice, once as the banner and once in the gallery).
--    Whoever decides should look at the shop page first.
-- ────────────────────────────────────────────────────────────────────────────
