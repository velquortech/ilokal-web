-- Migration 20260521000001 created broad policies named without "for" in the name.
-- Migration 20260526000006 dropped "Authenticated upload for product images" (different name),
-- leaving the broad policy active alongside the new owner-scoped ones.
-- This migration drops the broad policies by their actual names.
DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete product images" ON storage.objects;
