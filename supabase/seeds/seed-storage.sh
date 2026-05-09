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
create_bucket "product-images"

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
# Product images  (400x400)
# IDs 301–314 are owned by businesses.sql; 315–325 by products.sql
# ---------------------------------------------------------------------------
echo "Uploading product images..."
# The Artisan Roastery
upload "product-images" "33333333-3333-3333-3333-333333333301/product.jpg" "https://picsum.photos/seed/pourover/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333302/product.jpg" "https://picsum.photos/seed/flatwhite/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333303/product.jpg" "https://picsum.photos/seed/coldbrew/400/400"
# Flora & Flour Bakery
upload "product-images" "33333333-3333-3333-3333-333333333304/product.jpg" "https://picsum.photos/seed/pandesal/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333305/product.jpg" "https://picsum.photos/seed/ensaymada/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333306/product.jpg" "https://picsum.photos/seed/flan/400/400"
# The Handy Corner
upload "product-images" "33333333-3333-3333-3333-333333333307/product.jpg" "https://picsum.photos/seed/bulbs/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333308/product.jpg" "https://picsum.photos/seed/extension/400/400"
# Aura Hair Studio
upload "product-images" "33333333-3333-3333-3333-333333333309/product.jpg" "https://picsum.photos/seed/haircut/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333310/product.jpg" "https://picsum.photos/seed/haircolor/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333311/product.jpg" "https://picsum.photos/seed/keratin/400/400"
# Luna & Leaf Bistro
upload "product-images" "33333333-3333-3333-3333-333333333312/product.jpg" "https://picsum.photos/seed/signaturelatte/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333313/product.jpg" "https://picsum.photos/seed/zenbowl/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333314/product.jpg" "https://picsum.photos/seed/matcha/400/400"
# The Handy Corner (continued — from products.sql)
upload "product-images" "33333333-3333-3333-3333-333333333315/product.jpg" "https://picsum.photos/seed/gloves/400/400"
# Aura Hair Studio (continued — from products.sql)
upload "product-images" "33333333-3333-3333-3333-333333333316/product.jpg" "https://picsum.photos/seed/mencut/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333317/product.jpg" "https://picsum.photos/seed/womencut/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333318/product.jpg" "https://picsum.photos/seed/haircolor2/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333319/product.jpg" "https://picsum.photos/seed/blowout/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333320/product.jpg" "https://picsum.photos/seed/treatment/400/400"
# Luna & Leaf Bistro (continued — from products.sql)
upload "product-images" "33333333-3333-3333-3333-333333333321/product.jpg" "https://picsum.photos/seed/acaibowl/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333322/product.jpg" "https://picsum.photos/seed/grainbowl/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333323/product.jpg" "https://picsum.photos/seed/smoothie/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333324/product.jpg" "https://picsum.photos/seed/turmericlatte/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333325/product.jpg" "https://picsum.photos/seed/buddhabowl/400/400"

# ---------------------------------------------------------------------------
rm -rf "$TMP"
echo "Storage seed complete."
