#!/usr/bin/env bash
# Seeds local Supabase Storage with sample business images.
# Run after `make migrate-reset` whenever the Docker volume is wiped.
# Usage: bash supabase/seeders/seed-storage.sh
#
# Images come from loremflickr.com, which serves a real Flickr photo matching
# the KEYWORD in the URL path (e.g. .../400/400/coffee → a coffee photo). Each
# upload passes a keyword that matches the shop or product so test data looks
# professional and on-topic — logos, interiors, menu items, and services all
# resolve to relevant photos instead of random images. A deterministic
# ?lock=<hash-of-path> is appended per image so every rerun yields the same
# photo and no two slots collide. See the `lf` helper below.

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-http://127.0.0.1:54321}"
BASE="$SUPABASE_URL/storage/v1"
# Service-role key. Falls back to the well-known local dev JWT (identical for every
# local Supabase instance) so `make seed-storage` works out of the box locally.
# For a CLOUD target, set both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
# to the cloud project's values before running — uploads then go to the cloud buckets.
LOCAL_DEV_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$LOCAL_DEV_SERVICE_KEY}"
if [[ "$SUPABASE_URL" != *"127.0.0.1"* && "$SUPABASE_URL" != *"localhost"* && "$SERVICE_KEY" == "$LOCAL_DEV_SERVICE_KEY" ]]; then
  echo "Refusing to seed a non-local target ($SUPABASE_URL) with the local dev service key." >&2
  echo "Set SUPABASE_SERVICE_ROLE_KEY to the cloud project's service-role key first." >&2
  exit 1
fi
TMP=$(mktemp -d)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
# lf <w> <h> <keyword> -> a loremflickr URL for a photo matching <keyword>.
# Keep keywords broad and singular (e.g. "coffee", "bakery", "massage") so
# Flickr reliably has matches; the per-path lock is added at upload time.
lf() {
  printf 'https://loremflickr.com/%s/%s/%s' "$1" "$2" "$3"
}

create_bucket() {
  local id="$1"
  curl -sf -X POST "$BASE/bucket" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$id\",\"name\":\"$id\",\"public\":true}" \
    -o /dev/null && echo "  bucket '$id' created" || echo "  bucket '$id' already exists (skipped)"
}

upload() {
  local bucket="$1" path="$2" url="$3" mime="${4:-image/jpeg}"
  local status
  status=$(curl -so /dev/null -w "%{http_code}" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    "$BASE/object/$bucket/$path")
  if [ "$status" = "200" ]; then
    echo "  skipped $bucket/$path (already exists)"
    return
  fi
  # Append a deterministic lock (hash of the storage path) to loremflickr URLs
  # so every rerun fetches the same photo and each slot gets a distinct image.
  if [[ "$url" == *loremflickr.com/* && "$url" != *lock=* ]]; then
    local lock
    lock=$(printf '%s' "$path" | cksum | cut -d' ' -f1)
    if [[ "$url" == *\?* ]]; then url="$url&lock=$lock"; else url="$url?lock=$lock"; fi
  fi
  local tmp_file="$TMP/$(echo "$path" | tr '/' '_')"
  # Don't let a single flaky download (set -e) abort the whole seed run.
  # --connect-timeout fails fast on a dead host instead of waiting the full --max-time.
  if ! curl -sfL --connect-timeout 5 --retry 2 --max-time 30 "$url" -o "$tmp_file"; then
    echo "  failed download $bucket/$path ($url)"
    return
  fi
  curl -sf -X POST "$BASE/object/$bucket/$path" \
    -H "apikey: $SERVICE_KEY" \
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
# Logos  (400x400) — a recognizable object/subject for each shop
# ---------------------------------------------------------------------------
echo "Uploading logos..."
upload "shop-logos" "11111111-1111-1111-1111-111111111101/logo.jpg" "$(lf 400 400 coffee)"     # The Artisan Roastery
upload "shop-logos" "11111111-1111-1111-1111-111111111102/logo.jpg" "$(lf 400 400 bread)"      # Flora & Flour Bakery
upload "shop-logos" "11111111-1111-1111-1111-111111111103/logo.jpg" "$(lf 400 400 tools)"      # The Handy Corner
upload "shop-logos" "11111111-1111-1111-1111-111111111104/logo.jpg" "$(lf 400 400 hairdresser)" # Aura Hair Studio
upload "shop-logos" "11111111-1111-1111-1111-111111111105/logo.jpg" "$(lf 400 400 salad)"      # Luna & Leaf Bistro

# ---------------------------------------------------------------------------
# Interior images  (800x500 hero, 800x520 gallery) — venue-type keywords
# ---------------------------------------------------------------------------
echo "Uploading interior images..."
# The Artisan Roastery
upload "interior-images" "11111111-1111-1111-1111-111111111101/hero.jpg"     "$(lf 800 500 cafe)"
upload "interior-images" "11111111-1111-1111-1111-111111111101/gallery1.jpg" "$(lf 800 520 cafe)"
upload "interior-images" "11111111-1111-1111-1111-111111111101/gallery2.jpg" "$(lf 800 520 coffeeshop)"
upload "interior-images" "11111111-1111-1111-1111-111111111101/gallery3.jpg" "$(lf 800 520 barista)"
# Flora & Flour Bakery
upload "interior-images" "11111111-1111-1111-1111-111111111102/hero.jpg"     "$(lf 800 500 bakery)"
upload "interior-images" "11111111-1111-1111-1111-111111111102/gallery1.jpg" "$(lf 800 520 bakery)"
upload "interior-images" "11111111-1111-1111-1111-111111111102/gallery2.jpg" "$(lf 800 520 pastry)"
upload "interior-images" "11111111-1111-1111-1111-111111111102/gallery3.jpg" "$(lf 800 520 bread)"
# The Handy Corner
upload "interior-images" "11111111-1111-1111-1111-111111111103/hero.jpg"     "$(lf 800 500 hardware)"
upload "interior-images" "11111111-1111-1111-1111-111111111103/gallery1.jpg" "$(lf 800 520 hardware)"
upload "interior-images" "11111111-1111-1111-1111-111111111103/gallery2.jpg" "$(lf 800 520 tools)"
upload "interior-images" "11111111-1111-1111-1111-111111111103/gallery3.jpg" "$(lf 800 520 workshop)"
# Aura Hair Studio
upload "interior-images" "11111111-1111-1111-1111-111111111104/hero.jpg"     "$(lf 800 500 hairsalon)"
upload "interior-images" "11111111-1111-1111-1111-111111111104/gallery1.jpg" "$(lf 800 520 hairsalon)"
upload "interior-images" "11111111-1111-1111-1111-111111111104/gallery2.jpg" "$(lf 800 520 hairdresser)"
upload "interior-images" "11111111-1111-1111-1111-111111111104/gallery3.jpg" "$(lf 800 520 barbershop)"
# Luna & Leaf Bistro
upload "interior-images" "11111111-1111-1111-1111-111111111105/hero.jpg"     "$(lf 800 500 restaurant)"
upload "interior-images" "11111111-1111-1111-1111-111111111105/gallery1.jpg" "$(lf 800 520 restaurant)"
upload "interior-images" "11111111-1111-1111-1111-111111111105/gallery2.jpg" "$(lf 800 520 bistro)"
upload "interior-images" "11111111-1111-1111-1111-111111111105/gallery3.jpg" "$(lf 800 520 cafe)"

# ---------------------------------------------------------------------------
# Product images  (400x400)
# IDs 301–314 are owned by businesses.sql; 315–325 by products.sql
# ---------------------------------------------------------------------------
echo "Uploading product images..."
# The Artisan Roastery
upload "product-images" "33333333-3333-3333-3333-333333333301/product.jpg" "$(lf 400 400 coffee)"
upload "product-images" "33333333-3333-3333-3333-333333333302/product.jpg" "$(lf 400 400 coffee)"
upload "product-images" "33333333-3333-3333-3333-333333333303/product.jpg" "$(lf 400 400 coldbrew)"
# Flora & Flour Bakery
upload "product-images" "33333333-3333-3333-3333-333333333304/product.jpg" "$(lf 400 400 croissant)"
upload "product-images" "33333333-3333-3333-3333-333333333305/product.jpg" "$(lf 400 400 toast)"
upload "product-images" "33333333-3333-3333-3333-333333333306/product.jpg" "$(lf 400 400 bread)"
# The Handy Corner
upload "product-images" "33333333-3333-3333-3333-333333333307/product.jpg" "$(lf 400 400 lightbulb)"
upload "product-images" "33333333-3333-3333-3333-333333333308/product.jpg" "$(lf 400 400 cable)"
# Aura Hair Studio
upload "product-images" "33333333-3333-3333-3333-333333333309/product.jpg" "$(lf 400 400 hairdresser)"
upload "product-images" "33333333-3333-3333-3333-333333333310/product.jpg" "$(lf 400 400 haircolor)"
upload "product-images" "33333333-3333-3333-3333-333333333311/product.jpg" "$(lf 400 400 hairsalon)"
# Luna & Leaf Bistro
upload "product-images" "33333333-3333-3333-3333-333333333312/product.jpg" "$(lf 400 400 latte)"
upload "product-images" "33333333-3333-3333-3333-333333333313/product.jpg" "$(lf 400 400 salad)"
upload "product-images" "33333333-3333-3333-3333-333333333314/product.jpg" "$(lf 400 400 matcha)"
# The Handy Corner (continued — from products.sql)
upload "product-images" "33333333-3333-3333-3333-333333333315/product.jpg" "$(lf 400 400 gloves)"
# Aura Hair Studio (continued — from products.sql)
upload "product-images" "33333333-3333-3333-3333-333333333316/product.jpg" "$(lf 400 400 hairdresser)"
upload "product-images" "33333333-3333-3333-3333-333333333317/product.jpg" "$(lf 400 400 hairsalon)"
upload "product-images" "33333333-3333-3333-3333-333333333318/product.jpg" "$(lf 400 400 haircolor)"
upload "product-images" "33333333-3333-3333-3333-333333333319/product.jpg" "$(lf 400 400 hairsalon)"
upload "product-images" "33333333-3333-3333-3333-333333333320/product.jpg" "$(lf 400 400 haircare)"
# Luna & Leaf Bistro (continued — from products.sql)
upload "product-images" "33333333-3333-3333-3333-333333333321/product.jpg" "$(lf 400 400 acai)"
upload "product-images" "33333333-3333-3333-3333-333333333322/product.jpg" "$(lf 400 400 salad)"
upload "product-images" "33333333-3333-3333-3333-333333333323/product.jpg" "$(lf 400 400 smoothie)"
upload "product-images" "33333333-3333-3333-3333-333333333324/product.jpg" "$(lf 400 400 latte)"
upload "product-images" "33333333-3333-3333-3333-333333333325/product.jpg" "$(lf 400 400 salad)"

# ---------------------------------------------------------------------------
# New businesses — Logos (400x400)
# ---------------------------------------------------------------------------
echo "Uploading new business logos..."
upload "shop-logos" "11111111-1111-1111-1111-111111111106/logo.jpg" "$(lf 400 400 beer)"        # El Tapas & Brew
upload "shop-logos" "11111111-1111-1111-1111-111111111107/logo.jpg" "$(lf 400 400 barbecue)"    # Iloilo Street Eats
upload "shop-logos" "11111111-1111-1111-1111-111111111108/logo.jpg" "$(lf 400 400 grocery)"     # Sari-Sari ni Nena
upload "shop-logos" "11111111-1111-1111-1111-111111111109/logo.jpg" "$(lf 400 400 clothing)"    # Hablon & Hue Boutique
upload "shop-logos" "11111111-1111-1111-1111-111111111110/logo.jpg" "$(lf 400 400 books)"       # PageTurner Books
upload "shop-logos" "11111111-1111-1111-1111-111111111111/logo.jpg" "$(lf 400 400 spa)"         # Serenity Spa Iloilo
upload "shop-logos" "11111111-1111-1111-1111-111111111112/logo.jpg" "$(lf 400 400 dumbbell)"    # IronForge Fitness
upload "shop-logos" "11111111-1111-1111-1111-111111111113/logo.jpg" "$(lf 400 400 tools)"       # FixRight Repair Hub
upload "shop-logos" "11111111-1111-1111-1111-111111111114/logo.jpg" "$(lf 400 400 hotel)"       # Casa Ilongga B&B
upload "shop-logos" "11111111-1111-1111-1111-111111111115/logo.jpg" "$(lf 400 400 pottery)"     # Ilonggo Craft Workshop
upload "shop-logos" "11111111-1111-1111-1111-111111111116/logo.jpg" "$(lf 400 400 guitar)"      # The Lampara Live Music Bar

# ---------------------------------------------------------------------------
# New businesses — Interior images (800x500 hero, 800x520 gallery)
# ---------------------------------------------------------------------------
echo "Uploading new business interior images..."
# El Tapas & Brew
upload "interior-images" "11111111-1111-1111-1111-111111111106/hero.jpg"     "$(lf 800 500 pub)"
upload "interior-images" "11111111-1111-1111-1111-111111111106/gallery1.jpg" "$(lf 800 520 bar)"
upload "interior-images" "11111111-1111-1111-1111-111111111106/gallery2.jpg" "$(lf 800 520 beer)"
upload "interior-images" "11111111-1111-1111-1111-111111111106/gallery3.jpg" "$(lf 800 520 tapas)"
# Iloilo Street Eats
upload "interior-images" "11111111-1111-1111-1111-111111111107/hero.jpg"     "$(lf 800 500 streetfood)"
upload "interior-images" "11111111-1111-1111-1111-111111111107/gallery1.jpg" "$(lf 800 520 streetfood)"
upload "interior-images" "11111111-1111-1111-1111-111111111107/gallery2.jpg" "$(lf 800 520 grill)"
upload "interior-images" "11111111-1111-1111-1111-111111111107/gallery3.jpg" "$(lf 800 520 foodmarket)"
# Sari-Sari ni Nena
upload "interior-images" "11111111-1111-1111-1111-111111111108/hero.jpg"     "$(lf 800 500 store)"
upload "interior-images" "11111111-1111-1111-1111-111111111108/gallery1.jpg" "$(lf 800 520 grocery)"
upload "interior-images" "11111111-1111-1111-1111-111111111108/gallery2.jpg" "$(lf 800 520 shop)"
upload "interior-images" "11111111-1111-1111-1111-111111111108/gallery3.jpg" "$(lf 800 520 grocery)"
# Hablon & Hue Boutique
upload "interior-images" "11111111-1111-1111-1111-111111111109/hero.jpg"     "$(lf 800 500 boutique)"
upload "interior-images" "11111111-1111-1111-1111-111111111109/gallery1.jpg" "$(lf 800 520 boutique)"
upload "interior-images" "11111111-1111-1111-1111-111111111109/gallery2.jpg" "$(lf 800 520 clothing)"
upload "interior-images" "11111111-1111-1111-1111-111111111109/gallery3.jpg" "$(lf 800 520 fabric)"
# PageTurner Books
upload "interior-images" "11111111-1111-1111-1111-111111111110/hero.jpg"     "$(lf 800 500 bookstore)"
upload "interior-images" "11111111-1111-1111-1111-111111111110/gallery1.jpg" "$(lf 800 520 bookstore)"
upload "interior-images" "11111111-1111-1111-1111-111111111110/gallery2.jpg" "$(lf 800 520 books)"
upload "interior-images" "11111111-1111-1111-1111-111111111110/gallery3.jpg" "$(lf 800 520 library)"
# Serenity Spa Iloilo
upload "interior-images" "11111111-1111-1111-1111-111111111111/hero.jpg"     "$(lf 800 500 spa)"
upload "interior-images" "11111111-1111-1111-1111-111111111111/gallery1.jpg" "$(lf 800 520 spa)"
upload "interior-images" "11111111-1111-1111-1111-111111111111/gallery2.jpg" "$(lf 800 520 massage)"
upload "interior-images" "11111111-1111-1111-1111-111111111111/gallery3.jpg" "$(lf 800 520 wellness)"
# IronForge Fitness
upload "interior-images" "11111111-1111-1111-1111-111111111112/hero.jpg"     "$(lf 800 500 gym)"
upload "interior-images" "11111111-1111-1111-1111-111111111112/gallery1.jpg" "$(lf 800 520 gym)"
upload "interior-images" "11111111-1111-1111-1111-111111111112/gallery2.jpg" "$(lf 800 520 fitness)"
upload "interior-images" "11111111-1111-1111-1111-111111111112/gallery3.jpg" "$(lf 800 520 workout)"
# FixRight Repair Hub
upload "interior-images" "11111111-1111-1111-1111-111111111113/hero.jpg"     "$(lf 800 500 workshop)"
upload "interior-images" "11111111-1111-1111-1111-111111111113/gallery1.jpg" "$(lf 800 520 workshop)"
upload "interior-images" "11111111-1111-1111-1111-111111111113/gallery2.jpg" "$(lf 800 520 tools)"
upload "interior-images" "11111111-1111-1111-1111-111111111113/gallery3.jpg" "$(lf 800 520 repair)"
# Casa Ilongga B&B
upload "interior-images" "11111111-1111-1111-1111-111111111114/hero.jpg"     "$(lf 800 500 hotel)"
upload "interior-images" "11111111-1111-1111-1111-111111111114/gallery1.jpg" "$(lf 800 520 hotelroom)"
upload "interior-images" "11111111-1111-1111-1111-111111111114/gallery2.jpg" "$(lf 800 520 bedroom)"
upload "interior-images" "11111111-1111-1111-1111-111111111114/gallery3.jpg" "$(lf 800 520 guesthouse)"
# Ilonggo Craft Workshop
upload "interior-images" "11111111-1111-1111-1111-111111111115/hero.jpg"     "$(lf 800 500 craft)"
upload "interior-images" "11111111-1111-1111-1111-111111111115/gallery1.jpg" "$(lf 800 520 weaving)"
upload "interior-images" "11111111-1111-1111-1111-111111111115/gallery2.jpg" "$(lf 800 520 pottery)"
upload "interior-images" "11111111-1111-1111-1111-111111111115/gallery3.jpg" "$(lf 800 520 handicraft)"
# The Lampara Live Music Bar
upload "interior-images" "11111111-1111-1111-1111-111111111116/hero.jpg"     "$(lf 800 500 concert)"
upload "interior-images" "11111111-1111-1111-1111-111111111116/gallery1.jpg" "$(lf 800 520 liveband)"
upload "interior-images" "11111111-1111-1111-1111-111111111116/gallery2.jpg" "$(lf 800 520 bar)"
upload "interior-images" "11111111-1111-1111-1111-111111111116/gallery3.jpg" "$(lf 800 520 nightclub)"

# ---------------------------------------------------------------------------
# New products — Product images (400x400)  IDs 326–369, plus 370–385 (Iloilo Street Eats)
# ---------------------------------------------------------------------------
echo "Uploading new product images..."
# El Tapas & Brew
upload "product-images" "33333333-3333-3333-3333-333333333326/product.jpg" "$(lf 400 400 beer)"
upload "product-images" "33333333-3333-3333-3333-333333333327/product.jpg" "$(lf 400 400 appetizer)"
upload "product-images" "33333333-3333-3333-3333-333333333328/product.jpg" "$(lf 400 400 mojito)"
upload "product-images" "33333333-3333-3333-3333-333333333329/product.jpg" "$(lf 400 400 tapas)"
# Iloilo Street Eats
upload "product-images" "33333333-3333-3333-3333-333333333330/product.jpg" "$(lf 400 400 skewer)"
upload "product-images" "33333333-3333-3333-3333-333333333331/product.jpg" "$(lf 400 400 barbecue)"
upload "product-images" "33333333-3333-3333-3333-333333333332/product.jpg" "$(lf 400 400 friedfood)"
upload "product-images" "33333333-3333-3333-3333-333333333333/product.jpg" "$(lf 400 400 noodlesoup)"
upload "product-images" "33333333-3333-3333-3333-333333333370/product.jpg" "$(lf 400 400 streetfood)"
upload "product-images" "33333333-3333-3333-3333-333333333371/product.jpg" "$(lf 400 400 friedbanana)"
upload "product-images" "33333333-3333-3333-3333-333333333372/product.jpg" "$(lf 400 400 sweetpotato)"
upload "product-images" "33333333-3333-3333-3333-333333333373/product.jpg" "$(lf 400 400 grill)"
upload "product-images" "33333333-3333-3333-3333-333333333374/product.jpg" "$(lf 400 400 grill)"
upload "product-images" "33333333-3333-3333-3333-333333333375/product.jpg" "$(lf 400 400 friedchicken)"
upload "product-images" "33333333-3333-3333-3333-333333333376/product.jpg" "$(lf 400 400 friedfood)"
upload "product-images" "33333333-3333-3333-3333-333333333377/product.jpg" "$(lf 400 400 friedfood)"
upload "product-images" "33333333-3333-3333-3333-333333333378/product.jpg" "$(lf 400 400 streetfood)"
upload "product-images" "33333333-3333-3333-3333-333333333379/product.jpg" "$(lf 400 400 friedfood)"
upload "product-images" "33333333-3333-3333-3333-333333333380/product.jpg" "$(lf 400 400 springroll)"
upload "product-images" "33333333-3333-3333-3333-333333333381/product.jpg" "$(lf 400 400 friedbanana)"
upload "product-images" "33333333-3333-3333-3333-333333333382/product.jpg" "$(lf 400 400 tofu)"
upload "product-images" "33333333-3333-3333-3333-333333333383/product.jpg" "$(lf 400 400 drink)"
upload "product-images" "33333333-3333-3333-3333-333333333384/product.jpg" "$(lf 400 400 coconut)"
upload "product-images" "33333333-3333-3333-3333-333333333385/product.jpg" "$(lf 400 400 barbecue)"
# Sari-Sari ni Nena
upload "product-images" "33333333-3333-3333-3333-333333333334/product.jpg" "$(lf 400 400 noodles)"
upload "product-images" "33333333-3333-3333-3333-333333333335/product.jpg" "$(lf 400 400 eggs)"
upload "product-images" "33333333-3333-3333-3333-333333333336/product.jpg" "$(lf 400 400 cannedfood)"
upload "product-images" "33333333-3333-3333-3333-333333333337/product.jpg" "$(lf 400 400 rice)"
# Hablon & Hue Boutique
upload "product-images" "33333333-3333-3333-3333-333333333338/product.jpg" "$(lf 400 400 blouse)"
upload "product-images" "33333333-3333-3333-3333-333333333339/product.jpg" "$(lf 400 400 totebag)"
upload "product-images" "33333333-3333-3333-3333-333333333340/product.jpg" "$(lf 400 400 dress)"
upload "product-images" "33333333-3333-3333-3333-333333333341/product.jpg" "$(lf 400 400 scarf)"
# PageTurner Books
upload "product-images" "33333333-3333-3333-3333-333333333342/product.jpg" "$(lf 400 400 book)"
upload "product-images" "33333333-3333-3333-3333-333333333343/product.jpg" "$(lf 400 400 notebook)"
upload "product-images" "33333333-3333-3333-3333-333333333344/product.jpg" "$(lf 400 400 stationery)"
upload "product-images" "33333333-3333-3333-3333-333333333345/product.jpg" "$(lf 400 400 books)"
# Serenity Spa Iloilo
upload "product-images" "33333333-3333-3333-3333-333333333346/product.jpg" "$(lf 400 400 massage)"
upload "product-images" "33333333-3333-3333-3333-333333333347/product.jpg" "$(lf 400 400 massage)"
upload "product-images" "33333333-3333-3333-3333-333333333348/product.jpg" "$(lf 400 400 facial)"
upload "product-images" "33333333-3333-3333-3333-333333333349/product.jpg" "$(lf 400 400 spa)"
# IronForge Fitness
upload "product-images" "33333333-3333-3333-3333-333333333350/product.jpg" "$(lf 400 400 gym)"
upload "product-images" "33333333-3333-3333-3333-333333333351/product.jpg" "$(lf 400 400 workout)"
upload "product-images" "33333333-3333-3333-3333-333333333352/product.jpg" "$(lf 400 400 yoga)"
upload "product-images" "33333333-3333-3333-3333-333333333353/product.jpg" "$(lf 400 400 dance)"
# FixRight Repair Hub
upload "product-images" "33333333-3333-3333-3333-333333333354/product.jpg" "$(lf 400 400 smartphone)"
upload "product-images" "33333333-3333-3333-3333-333333333355/product.jpg" "$(lf 400 400 laptop)"
upload "product-images" "33333333-3333-3333-3333-333333333356/product.jpg" "$(lf 400 400 appliance)"
upload "product-images" "33333333-3333-3333-3333-333333333357/product.jpg" "$(lf 400 400 sewing)"
# Casa Ilongga B&B
upload "product-images" "33333333-3333-3333-3333-333333333358/product.jpg" "$(lf 400 400 bedroom)"
upload "product-images" "33333333-3333-3333-3333-333333333359/product.jpg" "$(lf 400 400 hotelroom)"
upload "product-images" "33333333-3333-3333-3333-333333333360/product.jpg" "$(lf 400 400 breakfast)"
upload "product-images" "33333333-3333-3333-3333-333333333361/product.jpg" "$(lf 400 400 travel)"
# Ilonggo Craft Workshop
upload "product-images" "33333333-3333-3333-3333-333333333362/product.jpg" "$(lf 400 400 weaving)"
upload "product-images" "33333333-3333-3333-3333-333333333363/product.jpg" "$(lf 400 400 pottery)"
upload "product-images" "33333333-3333-3333-3333-333333333364/product.jpg" "$(lf 400 400 dance)"
upload "product-images" "33333333-3333-3333-3333-333333333365/product.jpg" "$(lf 400 400 cooking)"
# The Lampara Live Music Bar
upload "product-images" "33333333-3333-3333-3333-333333333366/product.jpg" "$(lf 400 400 concert)"
upload "product-images" "33333333-3333-3333-3333-333333333367/product.jpg" "$(lf 400 400 lounge)"
upload "product-images" "33333333-3333-3333-3333-333333333368/product.jpg" "$(lf 400 400 cocktail)"
upload "product-images" "33333333-3333-3333-3333-333333333369/product.jpg" "$(lf 400 400 karaoke)"

# ---------------------------------------------------------------------------
# Cross-province businesses (117–121) — logo + interior (hero, gallery1)
# These IDs match the Guimaras/Antique/Capiz/Aklan/Negros rows in businesses.sql.
# ---------------------------------------------------------------------------
echo "Uploading cross-province business images..."
# Pitstop Mango Café (Guimaras)
upload "shop-logos"      "11111111-1111-1111-1111-111111111117/logo.jpg"     "$(lf 400 400 mango)"
upload "interior-images" "11111111-1111-1111-1111-111111111117/hero.jpg"     "$(lf 800 500 cafe)"
upload "interior-images" "11111111-1111-1111-1111-111111111117/gallery1.jpg" "$(lf 800 520 coffeeshop)"
# Antique Seafood Grill (Antique)
upload "shop-logos"      "11111111-1111-1111-1111-111111111118/logo.jpg"     "$(lf 400 400 seafood)"
upload "interior-images" "11111111-1111-1111-1111-111111111118/hero.jpg"     "$(lf 800 500 restaurant)"
upload "interior-images" "11111111-1111-1111-1111-111111111118/gallery1.jpg" "$(lf 800 520 seafood)"
# Roxas Bay Brews (Capiz)
upload "shop-logos"      "11111111-1111-1111-1111-111111111119/logo.jpg"     "$(lf 400 400 coffee)"
upload "interior-images" "11111111-1111-1111-1111-111111111119/hero.jpg"     "$(lf 800 500 cafe)"
upload "interior-images" "11111111-1111-1111-1111-111111111119/gallery1.jpg" "$(lf 800 520 coffeeshop)"
# Kalibo Heritage Bakeshop (Aklan)
upload "shop-logos"      "11111111-1111-1111-1111-111111111120/logo.jpg"     "$(lf 400 400 bread)"
upload "interior-images" "11111111-1111-1111-1111-111111111120/hero.jpg"     "$(lf 800 500 bakery)"
upload "interior-images" "11111111-1111-1111-1111-111111111120/gallery1.jpg" "$(lf 800 520 pastry)"
# Bacolod Wellness Retreat (Negros Occidental)
upload "shop-logos"      "11111111-1111-1111-1111-111111111121/logo.jpg"     "$(lf 400 400 spa)"
upload "interior-images" "11111111-1111-1111-1111-111111111121/hero.jpg"     "$(lf 800 500 spa)"
upload "interior-images" "11111111-1111-1111-1111-111111111121/gallery1.jpg" "$(lf 800 520 wellness)"

# ---------------------------------------------------------------------------
rm -rf "$TMP"
echo "Storage seed complete."
