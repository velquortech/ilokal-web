#!/usr/bin/env bash
# Fill storage gaps left by seed-storage.sh — LOCAL ONLY.
#
# WHY THIS EXISTS
#   `seed-storage.sh` deliberately swallows a failed download so one flaky
#   request cannot abort a 150-image seed (`set -e` would kill the run). The
#   cost is silent: the DB row keeps its `image_url`, the file never lands, and
#   the app renders a broken image. On a normal day that is invisible; on
#   camera it is half a menu of grey boxes.
#
#   loremflickr rate-limits under a burst, so a plain re-run of the whole seed
#   tends to fail a DIFFERENT set each pass and never converges.
#
# WHAT IT DOES
#   Derives the missing set FROM THE DATABASE — every row whose image path has
#   no matching storage object — rather than from a hardcoded list, so it stays
#   correct as seeds change. Retries with backoff, then falls back to a second
#   provider. Idempotent: a complete database is a no-op.

set -uo pipefail

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-http://127.0.0.1:54321}"
BASE="$SUPABASE_URL/storage/v1"
LOCAL_DEV_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$LOCAL_DEV_SERVICE_KEY}"
DB_CONTAINER="${DB_CONTAINER:-supabase_db_ilokal-web}"

# Local-only guard, matching the polarity the Makefile's cloud targets use.
case "$SUPABASE_URL" in
  *127.0.0.1*|*localhost*) ;;
  *) echo "Refusing: this is a local dev helper and \$NEXT_PUBLIC_SUPABASE_URL is $SUPABASE_URL" >&2; exit 1 ;;
esac

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

q() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -t -A -c "$1"; }

# Fetch with retry, then a second provider. Keyword-matched photos are nicer,
# but ANY image beats a broken one — a grey box reads as a bug.
fetch() {
  local out="$1" keyword="$2" seed="$3" w="$4" h="$5"
  for attempt in 1 2 3; do
    if curl -sfL --connect-timeout 6 --max-time 25 \
        "https://loremflickr.com/${w}/${h}/${keyword}?lock=${seed}" -o "$out" \
        && [ -s "$out" ]; then
      return 0
    fi
    sleep $(( attempt * 2 ))
  done
  curl -sfL --connect-timeout 6 --max-time 25 \
    "https://picsum.photos/seed/${seed}/${w}/${h}" -o "$out" && [ -s "$out" ]
}

upload() {
  local bucket="$1" path="$2" file="$3"
  curl -sf -X POST "$BASE/object/$bucket/$path" \
    -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: image/jpeg" --data-binary "@$file" -o /dev/null
}

fill() {
  local bucket="$1" rows="$2" w="$3" h="$4"
  local filled=0 failed=0
  [ -z "$rows" ] && { echo "  $bucket: already complete"; return; }

  while IFS='|' read -r path keyword; do
    [ -z "$path" ] && continue
    local seed file
    seed=$(printf '%s' "$path" | cksum | cut -d' ' -f1)
    file="$TMP/$(printf '%s' "$path" | tr '/' '_')"
    if fetch "$file" "${keyword:-shop}" "$seed" "$w" "$h" && upload "$bucket" "$path" "$file"; then
      filled=$(( filled + 1 ))
    else
      failed=$(( failed + 1 ))
      echo "    could not fill $bucket/$path" >&2
    fi
  done <<< "$rows"
  echo "  $bucket: filled $filled, failed $failed"
}

echo "Filling storage gaps (derived from the database)..."

# Products — keyword comes from the product's own name so the photo is on-topic.
fill "product-images" "$(q "
  SELECT p.image_url || '|' || lower(regexp_replace(split_part(p.name, ' ', 1), '[^a-zA-Z]', '', 'g'))
  FROM products p
  WHERE p.image_url IS NOT NULL AND p.image_url <> '' AND p.image_url NOT LIKE 'http%'
    AND NOT EXISTS (SELECT 1 FROM storage.objects o
                    WHERE o.bucket_id = 'product-images' AND o.name = p.image_url);
")" 400 400

fill "shop-logos" "$(q "
  SELECT b.logo_url || '|shop'
  FROM businesses b
  WHERE b.logo_url IS NOT NULL AND b.logo_url <> '' AND b.logo_url NOT LIKE 'http%'
    AND NOT EXISTS (SELECT 1 FROM storage.objects o
                    WHERE o.bucket_id = 'shop-logos' AND o.name = b.logo_url);
")" 400 400

fill "interior-images" "$(q "
  SELECT img || '|interior'
  FROM (SELECT unnest(interior_images) AS img FROM businesses) s
  WHERE img IS NOT NULL AND img <> '' AND img NOT LIKE 'http%'
    AND NOT EXISTS (SELECT 1 FROM storage.objects o
                    WHERE o.bucket_id = 'interior-images' AND o.name = s.img);
")" 800 520

echo "Done."
