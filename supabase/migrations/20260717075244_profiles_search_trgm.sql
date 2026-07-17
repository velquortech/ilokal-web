-- Performance (P13): trigram indexes for the remaining *global* leading-wildcard
-- searches. See .claude/PERFORMANCE_AUDIT.md (P13).
--
-- Audit of every `ilike('%…%')` call site:
--   * businesses.shop_name  — already indexed (20260605000002) ✓
--   * coupons.description   — already indexed (20260605000002) ✓
--   * admin user search (lib/api/admin/userQuery.ts, /api/admin/profiles) —
--     `full_name.ilike | email.ilike` over ALL profiles, unindexed → this file.
--   * everything else is either scoped by an indexed equality filter first
--     (products/coupons/branches searches all `.eq('business_id', …)` — tiny
--     per-owner sets, index not useful) or filters the `nearby_businesses`
--     RPC's result set (function scan; a table index can't apply).
--   * lib/api/search/searchQuery.ts ilike targets phantom columns — module is
--     NON-FUNCTIONAL (flagged in code), nothing to index.
--
-- Rollback: DROP INDEX public.idx_profiles_full_name_trgm;
--           DROP INDEX public.idx_profiles_email_trgm;

create extension if not exists pg_trgm;

create index if not exists idx_profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);

create index if not exists idx_profiles_email_trgm
  on public.profiles using gin (email gin_trgm_ops);
