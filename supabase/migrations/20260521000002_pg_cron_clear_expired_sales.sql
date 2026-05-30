-- Enable pg_cron extension (requires superuser; no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage so the cron job can be scheduled under the postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Remove any existing job with the same name to keep this migration idempotent
SELECT cron.unschedule('clear-expired-product-sales')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'clear-expired-product-sales'
);

-- Clear expired or not-yet-started sale fields every hour.
-- The query-level normalizeProductSale helper already prevents expired sales
-- from being surfaced to callers; this job keeps the DB clean over time.
SELECT cron.schedule(
  'clear-expired-product-sales',
  '0 * * * *',
  $$
    UPDATE public.products
    SET
      sale_price     = NULL,
      sale_starts_at = NULL,
      sale_ends_at   = NULL,
      updated_at     = NOW()
    WHERE sale_price IS NOT NULL
      AND (
        -- sale window has ended
        (sale_ends_at IS NOT NULL AND sale_ends_at < NOW())
        OR
        -- sale hasn't started yet but has an end date in the past (edge case)
        (sale_starts_at IS NOT NULL AND sale_ends_at IS NOT NULL AND sale_ends_at < NOW())
      );
  $$
);
