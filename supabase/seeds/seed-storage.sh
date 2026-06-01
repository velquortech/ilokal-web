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
  local bucket="$1" path="$2" url="$3" mime="${4:-image/jpeg}"
  local status
  status=$(curl -so /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    "$BASE/object/$bucket/$path")
  if [ "$status" = "200" ]; then
    echo "  skipped $bucket/$path (already exists)"
    return
  fi
  # picsum.photos has been unreliable (HTTP 522 outages). Rewrite its seeded URLs
  # (picsum.photos/seed/<seed>/<w>/<h>) to loremflickr, which serves deterministic
  # real photos via ?lock=<n> — the lock is a stable hash of the original seed.
  if [[ "$url" == *picsum.photos/seed/* ]]; then
    local rest seed w h lock
    rest="${url#*picsum.photos/seed/}"   # <seed>/<w>/<h>
    seed="${rest%%/*}"                    # <seed>
    w="${rest#*/}"; w="${w%/*}"           # <w>
    h="${rest##*/}"                       # <h>
    lock=$(printf '%s' "$seed" | cksum | cut -d' ' -f1)
    url="https://loremflickr.com/$w/$h?lock=$lock"
  fi
  local tmp_file="$TMP/$(echo "$path" | tr '/' '_')"
  # Don't let a single flaky download (set -e) abort the whole seed run.
  # --connect-timeout fails fast on a dead host instead of waiting the full --max-time.
  if ! curl -sfL --connect-timeout 5 --retry 2 --max-time 30 "$url" -o "$tmp_file"; then
    echo "  failed download $bucket/$path ($url)"
    return
  fi
  curl -sf -X POST "$BASE/object/$bucket/$path" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: $mime" \
    --data-binary "@$tmp_file" \
    -o /dev/null && echo "  uploaded $bucket/$path" || echo "  failed $bucket/$path"
}

# ---------------------------------------------------------------------------
# Buckets
# ---------------------------------------------------------------------------
echo "Creating buckets..."
create_bucket "shop-logos"
create_bucket "interior-images"
create_bucket "shop-banners"
create_bucket "product-images"
create_bucket "avatars"

# ---------------------------------------------------------------------------
# Seed account avatars  (200x200 PNG from DiceBear Avataaars)
# User IDs match supabase/seeds/users.sql named accounts
# ---------------------------------------------------------------------------
echo "Uploading seed account avatars..."
upload "avatars" "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/avatar.png" \
  "https://api.dicebear.com/9.x/avataaars/png?seed=admin-ilokal&backgroundColor=b6e3f4&size=200" \
  "image/png"
upload "avatars" "00000000-0000-0000-0000-000000000001/avatar.png" \
  "https://api.dicebear.com/9.x/avataaars/png?seed=owner-ilokal&backgroundColor=c0aede&size=200" \
  "image/png"
upload "avatars" "ffffffff-ffff-ffff-ffff-ffffffffffff/avatar.png" \
  "https://api.dicebear.com/9.x/avataaars/png?seed=testuser-ilokal&backgroundColor=d1d4f9&size=200" \
  "image/png"

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
upload "interior-images" "11111111-1111-1111-1111-111111111101/gallery3.jpg" "https://picsum.photos/seed/artisan-g3/800/520"
# Flora & Flour Bakery
upload "interior-images" "11111111-1111-1111-1111-111111111102/hero.jpg"     "https://picsum.photos/seed/florabakery-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111102/gallery1.jpg" "https://picsum.photos/seed/flora-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111102/gallery2.jpg" "https://picsum.photos/seed/flora-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111102/gallery3.jpg" "https://picsum.photos/seed/flora-g3/800/520"
# The Handy Corner
upload "interior-images" "11111111-1111-1111-1111-111111111103/hero.jpg"     "https://picsum.photos/seed/handystore-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111103/gallery1.jpg" "https://picsum.photos/seed/handy-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111103/gallery2.jpg" "https://picsum.photos/seed/handy-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111103/gallery3.jpg" "https://picsum.photos/seed/handy-g3/800/520"
# Aura Hair Studio
upload "interior-images" "11111111-1111-1111-1111-111111111104/hero.jpg"     "https://picsum.photos/seed/aurasalon-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111104/gallery1.jpg" "https://picsum.photos/seed/aura-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111104/gallery2.jpg" "https://picsum.photos/seed/aura-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111104/gallery3.jpg" "https://picsum.photos/seed/aura-g3/800/520"
# Luna & Leaf Bistro
upload "interior-images" "11111111-1111-1111-1111-111111111105/hero.jpg"     "https://picsum.photos/seed/lunaleaf-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111105/gallery1.jpg" "https://picsum.photos/seed/luna-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111105/gallery2.jpg" "https://picsum.photos/seed/luna-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111105/gallery3.jpg" "https://picsum.photos/seed/luna-g3/800/520"

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
# New businesses — Logos (400x400)
# ---------------------------------------------------------------------------
echo "Uploading new business logos..."
upload "shop-logos" "11111111-1111-1111-1111-111111111106/logo.jpg" "https://picsum.photos/seed/eltapas-logo/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111107/logo.jpg" "https://picsum.photos/seed/streetfood-logo/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111108/logo.jpg" "https://picsum.photos/seed/sarisari-logo/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111109/logo.jpg" "https://picsum.photos/seed/hablon-logo/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111110/logo.jpg" "https://picsum.photos/seed/pageturner-logo/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111111/logo.jpg" "https://picsum.photos/seed/serenity-logo/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111112/logo.jpg" "https://picsum.photos/seed/ironforge-logo/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111113/logo.jpg" "https://picsum.photos/seed/fixright-logo/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111114/logo.jpg" "https://picsum.photos/seed/casailongga-logo/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111115/logo.jpg" "https://picsum.photos/seed/craftshop-logo/400/400"
upload "shop-logos" "11111111-1111-1111-1111-111111111116/logo.jpg" "https://picsum.photos/seed/lampara-logo/400/400"

# ---------------------------------------------------------------------------
# New businesses — Interior images (800x500 hero, 800x520 gallery)
# ---------------------------------------------------------------------------
echo "Uploading new business interior images..."
# El Tapas & Brew
upload "interior-images" "11111111-1111-1111-1111-111111111106/hero.jpg"     "https://picsum.photos/seed/eltapas-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111106/gallery1.jpg" "https://picsum.photos/seed/eltapas-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111106/gallery2.jpg" "https://picsum.photos/seed/eltapas-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111106/gallery3.jpg" "https://picsum.photos/seed/eltapas-g3/800/520"
# Iloilo Street Eats
upload "interior-images" "11111111-1111-1111-1111-111111111107/hero.jpg"     "https://picsum.photos/seed/streetfood-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111107/gallery1.jpg" "https://picsum.photos/seed/streetfood-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111107/gallery2.jpg" "https://picsum.photos/seed/streetfood-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111107/gallery3.jpg" "https://picsum.photos/seed/streetfood-g3/800/520"
# Sari-Sari ni Nena
upload "interior-images" "11111111-1111-1111-1111-111111111108/hero.jpg"     "https://picsum.photos/seed/sarisari-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111108/gallery1.jpg" "https://picsum.photos/seed/sarisari-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111108/gallery2.jpg" "https://picsum.photos/seed/sarisari-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111108/gallery3.jpg" "https://picsum.photos/seed/sarisari-g3/800/520"
# Hablon & Hue Boutique
upload "interior-images" "11111111-1111-1111-1111-111111111109/hero.jpg"     "https://picsum.photos/seed/hablon-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111109/gallery1.jpg" "https://picsum.photos/seed/hablon-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111109/gallery2.jpg" "https://picsum.photos/seed/hablon-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111109/gallery3.jpg" "https://picsum.photos/seed/hablon-g3/800/520"
# PageTurner Books
upload "interior-images" "11111111-1111-1111-1111-111111111110/hero.jpg"     "https://picsum.photos/seed/pageturner-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111110/gallery1.jpg" "https://picsum.photos/seed/pageturner-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111110/gallery2.jpg" "https://picsum.photos/seed/pageturner-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111110/gallery3.jpg" "https://picsum.photos/seed/pageturner-g3/800/520"
# Serenity Spa Iloilo
upload "interior-images" "11111111-1111-1111-1111-111111111111/hero.jpg"     "https://picsum.photos/seed/serenity-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111111/gallery1.jpg" "https://picsum.photos/seed/serenity-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111111/gallery2.jpg" "https://picsum.photos/seed/serenity-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111111/gallery3.jpg" "https://picsum.photos/seed/serenity-g3/800/520"
# IronForge Fitness
upload "interior-images" "11111111-1111-1111-1111-111111111112/hero.jpg"     "https://picsum.photos/seed/ironforge-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111112/gallery1.jpg" "https://picsum.photos/seed/ironforge-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111112/gallery2.jpg" "https://picsum.photos/seed/ironforge-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111112/gallery3.jpg" "https://picsum.photos/seed/ironforge-g3/800/520"
# FixRight Repair Hub
upload "interior-images" "11111111-1111-1111-1111-111111111113/hero.jpg"     "https://picsum.photos/seed/fixright-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111113/gallery1.jpg" "https://picsum.photos/seed/fixright-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111113/gallery2.jpg" "https://picsum.photos/seed/fixright-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111113/gallery3.jpg" "https://picsum.photos/seed/fixright-g3/800/520"
# Casa Ilongga B&B
upload "interior-images" "11111111-1111-1111-1111-111111111114/hero.jpg"     "https://picsum.photos/seed/casailongga-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111114/gallery1.jpg" "https://picsum.photos/seed/casailongga-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111114/gallery2.jpg" "https://picsum.photos/seed/casailongga-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111114/gallery3.jpg" "https://picsum.photos/seed/casailongga-g3/800/520"
# Ilonggo Craft Workshop
upload "interior-images" "11111111-1111-1111-1111-111111111115/hero.jpg"     "https://picsum.photos/seed/craftshop-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111115/gallery1.jpg" "https://picsum.photos/seed/craftshop-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111115/gallery2.jpg" "https://picsum.photos/seed/craftshop-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111115/gallery3.jpg" "https://picsum.photos/seed/craftshop-g3/800/520"
# The Lampara Live Music Bar
upload "interior-images" "11111111-1111-1111-1111-111111111116/hero.jpg"     "https://picsum.photos/seed/lampara-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111116/gallery1.jpg" "https://picsum.photos/seed/lampara-g1/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111116/gallery2.jpg" "https://picsum.photos/seed/lampara-g2/800/520"
upload "interior-images" "11111111-1111-1111-1111-111111111116/gallery3.jpg" "https://picsum.photos/seed/lampara-g3/800/520"

# ---------------------------------------------------------------------------
# New products — Product images (400x400)  IDs 326–369
# ---------------------------------------------------------------------------
echo "Uploading new product images..."
# El Tapas & Brew
upload "product-images" "33333333-3333-3333-3333-333333333326/product.jpg" "https://picsum.photos/seed/craftbeer/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333327/product.jpg" "https://picsum.photos/seed/pulutan/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333328/product.jpg" "https://picsum.photos/seed/mojito/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333329/product.jpg" "https://picsum.photos/seed/tapasset/400/400"
# Iloilo Street Eats
upload "product-images" "33333333-3333-3333-3333-333333333330/product.jpg" "https://picsum.photos/seed/isaw/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333331/product.jpg" "https://picsum.photos/seed/porkbbq/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333332/product.jpg" "https://picsum.photos/seed/fishball/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333333/product.jpg" "https://picsum.photos/seed/batchoy/400/400"
# Sari-Sari ni Nena
upload "product-images" "33333333-3333-3333-3333-333333333334/product.jpg" "https://picsum.photos/seed/noodlebundle/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333335/product.jpg" "https://picsum.photos/seed/fresheggs/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333336/product.jpg" "https://picsum.photos/seed/sardines/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333337/product.jpg" "https://picsum.photos/seed/ricesack/400/400"
# Hablon & Hue Boutique
upload "product-images" "33333333-3333-3333-3333-333333333338/product.jpg" "https://picsum.photos/seed/hablonblouse/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333339/product.jpg" "https://picsum.photos/seed/totebag/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333340/product.jpg" "https://picsum.photos/seed/linendress/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333341/product.jpg" "https://picsum.photos/seed/fiberscarf/400/400"
# PageTurner Books
upload "product-images" "33333333-3333-3333-3333-333333333342/product.jpg" "https://picsum.photos/seed/filipinobook/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333343/product.jpg" "https://picsum.photos/seed/bulletjournal/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333344/product.jpg" "https://picsum.photos/seed/studyplanner/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333345/product.jpg" "https://picsum.photos/seed/novelset/400/400"
# Serenity Spa Iloilo
upload "product-images" "33333333-3333-3333-3333-333333333346/product.jpg" "https://picsum.photos/seed/swedishmassage/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333347/product.jpg" "https://picsum.photos/seed/hilotmassage/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333348/product.jpg" "https://picsum.photos/seed/facialtreat/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333349/product.jpg" "https://picsum.photos/seed/hotstonetherapy/400/400"
# IronForge Fitness
upload "product-images" "33333333-3333-3333-3333-333333333350/product.jpg" "https://picsum.photos/seed/gymmembership/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333351/product.jpg" "https://picsum.photos/seed/personaltrainer/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333352/product.jpg" "https://picsum.photos/seed/yogaclass/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333353/product.jpg" "https://picsum.photos/seed/zumbaclass/400/400"
# FixRight Repair Hub
upload "product-images" "33333333-3333-3333-3333-333333333354/product.jpg" "https://picsum.photos/seed/phonerepair/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333355/product.jpg" "https://picsum.photos/seed/laptoprepair/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333356/product.jpg" "https://picsum.photos/seed/appliancefix/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333357/product.jpg" "https://picsum.photos/seed/tailoring/400/400"
# Casa Ilongga B&B
upload "product-images" "33333333-3333-3333-3333-333333333358/product.jpg" "https://picsum.photos/seed/standardroom/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333359/product.jpg" "https://picsum.photos/seed/deluxeroom/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333360/product.jpg" "https://picsum.photos/seed/filipinobreakfast/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333361/product.jpg" "https://picsum.photos/seed/citytour/400/400"
# Ilonggo Craft Workshop
upload "product-images" "33333333-3333-3333-3333-333333333362/product.jpg" "https://picsum.photos/seed/weavingclass/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333363/product.jpg" "https://picsum.photos/seed/pottery/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333364/product.jpg" "https://picsum.photos/seed/dinagyang/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333365/product.jpg" "https://picsum.photos/seed/cookingclass/400/400"
# The Lampara Live Music Bar
upload "product-images" "33333333-3333-3333-3333-333333333366/product.jpg" "https://picsum.photos/seed/livemusic/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333367/product.jpg" "https://picsum.photos/seed/privatebooth/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333368/product.jpg" "https://picsum.photos/seed/cocktailpitcher/400/400"
upload "product-images" "33333333-3333-3333-3333-333333333369/product.jpg" "https://picsum.photos/seed/karaokeroom/400/400"

# ---------------------------------------------------------------------------
# Cross-province businesses (117–121) — logo + interior (hero, gallery1)
# These IDs match the Guimaras/Antique/Capiz/Aklan/Negros rows in businesses.sql.
# ---------------------------------------------------------------------------
echo "Uploading cross-province business images..."
# Pitstop Mango Café (Guimaras)
upload "shop-logos"      "11111111-1111-1111-1111-111111111117/logo.jpg"     "https://picsum.photos/seed/pitstopmango-logo/400/400"
upload "interior-images" "11111111-1111-1111-1111-111111111117/hero.jpg"     "https://picsum.photos/seed/pitstopmango-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111117/gallery1.jpg" "https://picsum.photos/seed/pitstopmango-g1/800/520"
# Antique Seafood Grill (Antique)
upload "shop-logos"      "11111111-1111-1111-1111-111111111118/logo.jpg"     "https://picsum.photos/seed/antiqueseafood-logo/400/400"
upload "interior-images" "11111111-1111-1111-1111-111111111118/hero.jpg"     "https://picsum.photos/seed/antiqueseafood-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111118/gallery1.jpg" "https://picsum.photos/seed/antiqueseafood-g1/800/520"
# Roxas Bay Brews (Capiz)
upload "shop-logos"      "11111111-1111-1111-1111-111111111119/logo.jpg"     "https://picsum.photos/seed/roxasbay-logo/400/400"
upload "interior-images" "11111111-1111-1111-1111-111111111119/hero.jpg"     "https://picsum.photos/seed/roxasbay-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111119/gallery1.jpg" "https://picsum.photos/seed/roxasbay-g1/800/520"
# Kalibo Heritage Bakeshop (Aklan)
upload "shop-logos"      "11111111-1111-1111-1111-111111111120/logo.jpg"     "https://picsum.photos/seed/kalibobakeshop-logo/400/400"
upload "interior-images" "11111111-1111-1111-1111-111111111120/hero.jpg"     "https://picsum.photos/seed/kalibobakeshop-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111120/gallery1.jpg" "https://picsum.photos/seed/kalibobakeshop-g1/800/520"
# Bacolod Wellness Retreat (Negros Occidental)
upload "shop-logos"      "11111111-1111-1111-1111-111111111121/logo.jpg"     "https://picsum.photos/seed/bacolodwellness-logo/400/400"
upload "interior-images" "11111111-1111-1111-1111-111111111121/hero.jpg"     "https://picsum.photos/seed/bacolodwellness-hero/800/500"
upload "interior-images" "11111111-1111-1111-1111-111111111121/gallery1.jpg" "https://picsum.photos/seed/bacolodwellness-g1/800/520"

# ---------------------------------------------------------------------------
rm -rf "$TMP"
echo "Storage seed complete."
