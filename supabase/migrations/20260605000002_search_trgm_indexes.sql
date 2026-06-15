-- Trigram search indexes so mobile text search (`?q=`) uses an index instead of
-- a sequential ILIKE scan over the catalog.
--
-- Consumers:
--   * app/api/mobile/deals/route.ts        — ILIKE on coupons.description, and
--                                             resolves matching businesses by
--                                             shop_name to OR into the coupons query
--   * app/api/mobile/businesses/nearby     — ILIKE on business shop_name
create extension if not exists pg_trgm;

create index if not exists idx_coupons_description_trgm
  on public.coupons using gin (description gin_trgm_ops);

create index if not exists idx_businesses_shop_name_trgm
  on public.businesses using gin (shop_name gin_trgm_ops);
