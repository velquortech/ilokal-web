#!/usr/bin/env bash
# Stitch the per-spec Playwright clips into one walkthrough mp4.
#
# Playwright records one .webm per test. Six separate files are fine for
# debugging and useless for showing someone the product, so this concatenates
# them in spec order and re-encodes to mp4 (webm plays nowhere reliably outside
# a browser).
#
# ffmpeg comes from Playwright's own browser cache — no system install and no
# new dependency.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS="$ROOT/.artifacts/test-results"
OUT_DIR="$ROOT/.artifacts"
OUT="$OUT_DIR/ilokal-walkthrough.mp4"

# A SYSTEM ffmpeg is required, not Playwright's bundled one.
#
# The bundled binary (~/.cache/ms-playwright/ffmpeg-*/ffmpeg-linux) exists only
# to turn Playwright's screencast frames into webm: it ships the image2pipe
# demuxer and a libvpx encoder and little else — no concat demuxer, no libx264.
# Feeding it a concat list fails with "Unrecognized option 'safe'". So stitching
# needs a real build.
if ! command -v ffmpeg >/dev/null 2>&1; then
  cat >&2 <<'MSG'
ffmpeg is not installed.

  Debian/Ubuntu:  sudo apt-get install -y ffmpeg
  macOS:          brew install ffmpeg

Playwright's bundled ffmpeg cannot do this — it has no concat demuxer and no
H.264 encoder. The per-spec .webm clips in e2e/.artifacts/test-results/ are
still perfectly watchable in a browser without this step.
MSG
  exit 1
fi
FFMPEG=ffmpeg

# Spec order IS story order (owner builds -> customer consumes -> owner
# measures), and Playwright names each result dir after its spec, so a plain
# lexical sort over the directory names reproduces the narrative.
mapfile -t CLIPS < <(find "$RESULTS" -name '*.webm' -type f 2>/dev/null | sort)

if [ ${#CLIPS[@]} -eq 0 ]; then
  echo "No clips found in $RESULTS — run \`make e2e\` first." >&2
  exit 1
fi

echo "Stitching ${#CLIPS[@]} clips..."
LIST="$OUT_DIR/concat.txt"
: > "$LIST"
for clip in "${CLIPS[@]}"; do
  echo "  $(basename "$(dirname "$clip")")"
  printf "file '%s'\n" "$clip" >> "$LIST"
done

# Re-encode rather than stream-copy: the clips can differ in resolution and
# timebase, and -c copy silently produces a file that stalls at the first seam.
"$FFMPEG" -y -f concat -safe 0 -i "$LIST" \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30" \
  -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
  "$OUT" 2>&1 | tail -3

rm -f "$LIST"
echo ""
echo "Walkthrough: $OUT"
ls -lh "$OUT" | awk '{print "  " $5}'
