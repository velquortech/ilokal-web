-- ============================================================
-- Fix the six placeholder Retail category images
-- ------------------------------------------------------------
-- `Agrivet / Farm Supply`, `Auto Supply / Motor Parts`, `Hardware /
-- Construction Supply`, `Pharmacy / Drugstore`, `Pet Shop` and
-- `Sports & Outdoor Shop` carry `https://picsum.photos/seed/ilokal-*`
-- URLs — the "six tiles" defect 20260805130000 was written to fix.
-- Its guarded INSERTs (WHERE NOT EXISTS on name) skipped because the
-- rows already existed (created by an older seed that used picsum),
-- so the placeholder URLs survived on every database that had been
-- seeded before that migration.
--
-- In production the CSP pushes a bare `https:` so these LOAD — but
-- they are random stock photos, not category imagery, and the
-- dev-mode CSP (imageRemotePatterns) blocks them entirely because
-- picsum 302s to fastly.picsum.photos. The curated URLs below are the
-- ones 20260805130000 / the seed's block 3a declare.
--
-- Matched on BOTH spellings of the Sports row: 20260814000000 renames
-- 'Sports & Outdoor Shop' → 'Sports / Outdoor Shop', and the combined
-- live apply runs this migration AFTER that rename, while a standalone
-- apply sees the old name. Guarded on the picsum URL prefix so a row
-- that already carries the right image is never touched.
--
-- Rollback:
--   UPDATE public.business_categories SET image_url =
--     'https://picsum.photos/seed/ilokal-<seed>/800/600' WHERE name IN (...);
-- ============================================================

UPDATE public.business_categories bc
   SET image_url = v.url
  FROM (VALUES
    ('Agrivet / Farm Supply',
     'https://images.unsplash.com/photo-1756158450046-24e51d854f71?q=80&w=1600&h=1200&fit=crop&auto=format'),
    ('Auto Supply / Motor Parts',
     'https://images.unsplash.com/photo-1777213003360-0419fd2fbfdf?q=80&w=1600&h=1200&fit=crop&auto=format'),
    ('Hardware / Construction Supply',
     'https://images.unsplash.com/photo-1759200165738-6366977a73c6?q=80&w=1600&h=1200&fit=crop&auto=format'),
    ('Pharmacy / Drugstore',
     'https://images.unsplash.com/photo-1580281657529-557a6abb6387?q=80&w=1600&h=1200&fit=crop&auto=format'),
    ('Pet Shop',
     'https://images.unsplash.com/photo-1516453734593-8d198ae84bcf?q=80&w=1600&h=1200&fit=crop&auto=format'),
    ('Sports & Outdoor Shop',
     'https://images.unsplash.com/photo-1768145488772-db787036bb13?q=80&w=1600&h=1200&fit=crop&auto=format'),
    ('Sports / Outdoor Shop',
     'https://images.unsplash.com/photo-1768145488772-db787036bb13?q=80&w=1600&h=1200&fit=crop&auto=format')
  ) AS v(name, url)
 WHERE bc.name = v.name
   AND bc.image_url LIKE 'https://picsum.photos/%'
   AND bc.deleted_at IS NULL;
