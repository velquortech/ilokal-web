# Seeds

Demo/test data for the local Supabase stack (and, for the curated files, the
cloud preview project). Two layers:

1. **Curated seeds** — hand-crafted hero rows (`businesses.sql`, `products.sql`,
   `coupons.sql`, `events.sql`, …) with stable, human-readable UUIDs.
2. **Filler volume** (`bulk_seed.sql`) — procedural rows layered on top so every
   list crosses ≥2 pagination pages and every edge-case the app exercises
   (near-cap coupons, empty ratings, disabled products, …) is covered.

## Run order

```bash
make migrate-reset   # supabase db reset: migrations + config.toml seed paths
make seed            # = seed-storage (storage objects) + seed-db (SQL rows)
```

- `config.toml` `[db.seed] sql_paths` seeds the **curated** files on every
  `db reset` (hero businesses, products, coupons, posts, events, …).
- `make seed-db` runs the **full** list in order — curated files, then
  `events.sql`, `follows.sql`, `bulk_seed.sql`, `view_counts.sql`, and finally
  `real_world_gaps.sql` (the gaps file must run **last**: it nulls images, and
  `bulk_seed`'s migration UPDATEs re-point rows before it).
- `make seed-storage` uploads storage objects **before** `seed-db` so every
  path the SQL rows reference already exists.

## Distinct photos — no two shops, products, or posts share an image

Every filler shop, product, and post gets its **own** storage object. The DB
rows store raw in-bucket paths (`<id>/logo.jpg`, `<id>/product.jpg`, …) using
the same conventions as the hero businesses, and `seed-storage.sh` uploads one
distinct photo per path:

| Surface | Bucket | Path convention | Count (filler) |
|---|---|---|---|
| Shop logo | `shop-logos` | `<biz_id>/logo.jpg` | 40 |
| Shop banner | `shop-banners` | `<biz_id>/banner.jpg` | 40 |
| Shop interiors | `interior-images` | `<biz_id>/hero.jpg`, `<biz_id>/gallery1.jpg` | 80 |
| Product | `product-images` | `<prod_id>/product.jpg` | 520 |
| Post | `business-posts` | `<post_id>/post.jpg` | 53 |

The two files **must stay in sync** — `seed-storage.sh`'s loops mirror
`bulk_seed.sql`'s id derivations exactly (shop `b` 1..40, product `b*100+p`,
post `b*10+1` / weekend `b*10+2` every 3rd shop). Both carry `keep in sync`
comments; the loop bounds are duplicated by design because shell and PL/pgSQL
cannot share constants.

**Why `business-posts`:** the Updates feed (mobile + web) resolves post
`image_url` against the `business-posts` bucket. Filler posts previously stored
hero `interior-images` paths there — which 404'd in the feed. Post images must
live in the bucket the feed reads.

**Determinism:** picsum.photos serves a stable image per seed string. Each
upload bakes a `cksum(path)` lock into the seed URL, so every rerun fetches the
same photo and no two paths collide — even when the keyword cycle repeats.
Re-running `seed-storage.sh` is safe: existing objects are skipped.

## Real-world gaps (`real_world_gaps.sql`) — LOCAL ONLY

Real shops don't all upload every photo. This file simulates that spread so the
fallback/placeholder states are actually exercised. It is **deliberately
excluded** from `CLOUD_SEED_FILES` and `config.toml` — cloud seeding must never
null images on a project meant to look finished.

- **Deterministic, not random:** each business's gap derives from `md5(id)`, so
  every re-seed (and every machine) yields the same state.
- Spread: ~5% fully bare, ~10% no gallery, ~15% no logo, ~20% no banner.
- **Featured shops** (active non-Free subscription) are never fully bare and
  keep their logo.
- **Hero showcase shops** (`businesses.sql` 101..116) are never gapped.
- Gaps land only on filler (`f0000001-…`) and cross-province (117..121) rows.

## Events (`events.sql` + `events_enable.sql`)

14 events covering every status the app surfaces: `approved` (public; three
with banner priority), `pending_review` (admin queue), `rejected` (with a
`review_note`), and `draft` (owner-only), plus one product-promoting event that
exercises the composite FK. Idempotent via `ON CONFLICT`.

The events feature ships dark (`enable_events = false`), so `events_enable.sql`
flips it on — but **local-only**: it runs in the Makefile `seed-db` loop and
`config.toml` (`db reset`), and is deliberately **excluded from
`CLOUD_SEED_FILES`**, so `make seed-cloud` keeps the public events surface dark
in production.

## Idempotency

- **SQL:** deterministic UUIDs + `ON CONFLICT (id) DO NOTHING`; migration
  UPDATEs guard on `IS DISTINCT FROM` so they are no-ops once rows point at
  their own paths.
- **Storage:** uploads skip existing objects.
- **Gaps:** md5-deterministic, so re-applying yields the identical final state.
  (Re-running `bulk_seed` alone restores rows gaps nulled — that's expected;
  `make seed` always runs gaps last, which re-applies them.)

Verified from scratch: `make migrate-reset && make seed` reproduces the exact
same distinct-photo state (61 shops / 520 products / 53 posts, zero shared
paths, zero broken references) on every run.
