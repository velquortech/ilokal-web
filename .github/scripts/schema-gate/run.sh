#!/usr/bin/env bash
# Run the schema gate for one commit against a production schema snapshot.
#
#   run.sh <head-ref> <schema.json|unavailable>
#
# The baseline is the merge-base with origin/main — not the PR's own base — so
# a stacked PR is judged as "this stack landing on main", which is when its
# code and migrations actually reach production. Needs node, git and the repo's
# node_modules (for the `typescript` parser).
set -euo pipefail

HEAD_REF=${1:?head ref}
SCHEMA=${2:?schema file or "unavailable"}
GATE="$(cd "$(dirname "$0")" && pwd)/gate.mjs"
ROOT=$(git rev-parse --show-toplevel)

HEAD_SHA=$(git rev-parse "$HEAD_REF")
BASE_SHA=$(git merge-base origin/main "$HEAD_SHA")

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
git archive "$HEAD_SHA" | tar -x -C "$WORK" --one-top-level=head
git archive "$BASE_SHA" | tar -x -C "$WORK" --one-top-level=base

# SQL of every migration this change ADDS: what it can be credited with creating.
git diff --name-only --diff-filter=A "$BASE_SHA" "$HEAD_SHA" -- supabase/migrations |
  while read -r f; do git show "$HEAD_SHA:$f"; done >"$WORK/added.sql"

# Versions on main as it is NOW — not at the merge-base: merging deploys
# today's main plus this change, so production must already have every
# migration main carries for the pipeline to count as healthy. (Measured at
# the merge-base, a PR branched before a stuck migration would not see it.)
git ls-tree --name-only origin/main supabase/migrations/ |
  sed -n 's|^supabase/migrations/\([0-9]\{1,\}\)_.*\.sql$|\1|p' >"$WORK/base-versions.txt"

echo "Schema gate: $(git rev-parse --short "$HEAD_SHA") vs merge-base $(git rev-parse --short "$BASE_SHA") with main"
cd "$ROOT"
node "$GATE" check \
  --head "$WORK/head" --base "$WORK/base" --schema "$SCHEMA" \
  --added-migrations "$WORK/added.sql" --base-migrations "$WORK/base-versions.txt"
