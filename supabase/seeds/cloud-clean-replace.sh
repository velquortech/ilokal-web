#!/usr/bin/env bash
# One-off: surgically wipe the seed/demo domain data on the CLOUD project and
# re-seed it fresh (so the raw-path image data + login lockdown actually land on
# rows that already exist). PRESERVES auth.users / profiles / subscription_plans /
# business_categories — so the real (non-seed) accounts and reference data survive.
#
# Why this exists: the normal `make seed-cloud` uses ON CONFLICT DO NOTHING, so it
# CANNOT fix rows that are already present with broken 127.0.0.1 image URLs. This
# deletes those rows first, then lets the seeds INSERT cleanly.
#
# This machine has no local `psql`, so SQL runs through the Supabase Postgres image
# with --network host (uses the host's IPv6 to reach db.<ref>.supabase.co:5432).
#
# Usage:
#   set -a; . ./.env.cloud; set +a
#   bash supabase/seeds/cloud-clean-replace.sh --yes
#
# DESTRUCTIVE on the cloud project's demo data. Requires --yes to run.

set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

[ "${1:-}" = "--yes" ] || { echo "Refusing without --yes (this DELETEs demo rows on cloud)."; exit 1; }

: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL (load .env.cloud first)}"
: "${NEXT_PUBLIC_SUPABASE_URL:?set NEXT_PUBLIC_SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?set SUPABASE_SERVICE_ROLE_KEY}"

case "$SUPABASE_DB_URL$NEXT_PUBLIC_SUPABASE_URL" in
  *127.0.0.1*|*localhost*) echo "Refusing: target looks LOCAL. This script is cloud-only."; exit 1;;
esac

IMG="$(docker inspect supabase_db_ilokal-web --format '{{.Config.Image}}' 2>/dev/null || echo public.ecr.aws/supabase/postgres:17.6.1.106)"
psql_cloud() { docker run --rm --network host -i "$IMG" psql "$SUPABASE_DB_URL" "$@"; }

echo "==> Target: $NEXT_PUBLIC_SUPABASE_URL"
echo "==> Image : $IMG"

echo "==> STEP 1/4: wipe demo domain rows (transaction, FK enforcement off)"
psql_cloud -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
SET LOCAL session_replication_role = 'replica';
DELETE FROM user_redemptions;
DELETE FROM ratings;
DELETE FROM business_ratings;
DELETE FROM business_posts;
DELETE FROM business_subscriptions;
DELETE FROM follows;
DELETE FROM coupons;
DELETE FROM products;
DELETE FROM branches;
DELETE FROM businesses;
-- NOTE: view_counts is NOT a table — it's a seed of UPDATEs to businesses/products
-- .weekly_view_count, so there is nothing to delete here.
DELETE FROM view_events;
DELETE FROM notifications;
COMMIT;
SQL

echo "==> STEP 2/4: re-seed domain data (fresh INSERTs)"
for f in users subscription_plans business_categories businesses products \
         coupons ratings business_subscriptions business_posts follows \
         bulk_seed view_counts; do
  echo "    seeding $f.sql"
  psql_cloud -v ON_ERROR_STOP=1 -q < "supabase/seeds/$f.sql"
done

echo "==> STEP 3/4: login lockdown (only admin@/owner@/testuser@ilokal.dev can sign in)"
psql_cloud -v ON_ERROR_STOP=1 < supabase/seeds/cloud-lockdown.sql

echo "==> STEP 4/4: upload storage objects to cloud buckets"
bash supabase/seeds/seed-storage.sh

echo "==> Done. Verifying..."
psql_cloud -tA <<'SQL'
SELECT 'businesses', count(*) FROM businesses
UNION ALL SELECT 'businesses_broken_url', count(*) FROM businesses WHERE logo_url LIKE '%127.0.0.1%'
UNION ALL SELECT 'products', count(*) FROM products
UNION ALL SELECT 'products_broken_url', count(*) FROM products WHERE image_url LIKE '%127.0.0.1%'
UNION ALL SELECT 'coupons', count(*) FROM coupons
UNION ALL SELECT 'follows', count(*) FROM follows
UNION ALL SELECT 'auth_users_total', count(*) FROM auth.users
UNION ALL SELECT 'auth_users_can_login', count(*) FROM auth.users WHERE banned_until IS NULL AND encrypted_password IS NOT NULL;
SQL
