#!/usr/bin/env bash
# Seeds local Supabase Storage with sample business images.
# Run after `make migrate-reset` whenever the Docker volume is wiped.
# Usage: bash supabase/seeders/seed-storage.sh

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-http://127.0.0.1:54321}"
BASE="$SUPABASE_URL/storage/v1"
# Default local dev service-role JWT (same for every local Supabase instance)
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
TMP=$(mktemp -d)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
create_bucket() {
  local id="$1"
  curl -sf -X POST "$BASE/bucket" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$id\",\"name\":\"$id\",\"public\":true}" \
    -o /dev/null && echo "  bucket '$id' created" || echo "  bucket '$id' already exists (skipped)"
}

upload() {
  local bucket="$1" path="$2" url="$3"
  local tmp_file="$TMP/$(echo "$path" | tr '/' '_')"
  curl -sfL "$url" -o "$tmp_file"
  curl -sf -X POST "$BASE/object/$bucket/$path" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: image/jpeg" \
    --data-binary "@$tmp_file" \
    -o /dev/null && echo "  uploaded $bucket/$path" || echo "  skipped $bucket/$path (already exists)"
}

# ---------------------------------------------------------------------------
# Buckets
# ---------------------------------------------------------------------------
echo "Creating buckets..."
create_bucket "shop-logos"
create_bucket "interior-images"
create_bucket "shop-banners"

# ---------------------------------------------------------------------------
# Logos  (400x400)
# ---------------------------------------------------------------------------
echo "Uploading logos..."
upload "shop-logos" "11111111-1111-1111-1111-111111111101/logo.jpg" "https://picsum.photos/seed/artisancafe/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111102/logo.jpg" "https://picsum.photos/seed/florabakery/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111103/logo.jpg" "https://picsum.photos/seed/handystore/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111104/logo.jpg" "https://picsum.photos/seed/aurasalon/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111105/logo.jpg" "https://picsum.photos/seed/lunaleaf/400/400"

# ---------------------------------------------------------------------------
# Interior images  (800x500 hero, 800x520 gallery)
# ---------------------------------------------------------------------------
echo "Uploading interior images..."
# The Artisan Roastery
upload "interior-images" "11111111-1111-1111-1111-111111111101/hero.jpg"     "https://picsum.photos/seed/artisancafe-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111101/gallery1.jpg" "https://picsum.photos/seed/artisan-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111101/gallery2.jpg" "https://picsum.photos/seed/artisan-g2/800/520"
# Flora & Flour Bakery
upload "interior-images" "11111111-1111-1111-1111-111111111102/hero.jpg"     "https://picsum.photos/seed/florabakery-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111102/gallery1.jpg" "https://picsum.photos/seed/flora-g1/800/520"
# The Handy Corner
upload "interior-images" "11111111-1111-1111-1111-111111111103/hero.jpg"     "https://picsum.photos/seed/handystore-hero/800/500"
# Aura Hair Studio
upload "interior-images" "11111111-1111-1111-1111-111111111104/hero.jpg"     "https://picsum.photos/seed/aurasalon-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111104/gallery1.jpg" "https://picsum.photos/seed/aura-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111104/gallery2.jpg" "https://picsum.photos/seed/aura-g2/800/520"
# Luna & Leaf Bistro
upload "interior-images" "11111111-1111-1111-1111-111111111105/hero.jpg"     "https://picsum.photos/seed/lunaleaf-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111105/gallery1.jpg" "https://picsum.photos/seed/luna-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111105/gallery2.jpg" "https://picsum.photos/seed/luna-g2/800/520"

# ---------------------------------------------------------------------------
rm -rf "$TMP"
echo "Storage seed complete."
