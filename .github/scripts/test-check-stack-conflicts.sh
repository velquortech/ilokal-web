#!/usr/bin/env bash
# End-to-end test for check-stack-conflicts.sh, against a throwaway repo.
#
# Builds a bare "origin" with a main that has moved on, seven open PRs covering
# every auto-resolve path, and a stub `gh` that serves the PR list and records
# every label/comment call. Then runs the real script — real merges, real
# pushes to the bare repo — and asserts on the branches and the gh log.
#
# Run: bash .github/scripts/test-check-stack-conflicts.sh

set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/check-stack-conflicts.sh"
T=$(mktemp -d)
[[ -n "${KEEP:-}" ]] && echo "fixture kept in $T" || trap 'rm -rf "$T"' EXIT
fails=0

export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1

g() { git -C "$T/work" -c core.hooksPath=/dev/null "$@"; }
commit_all() { g add -A && g commit -qm "$1"; }
# Insert a changelog entry at the top, where every branch also appends.
add_entry() { sed -i "s/^# Changelog$/# Changelog\n\n## $1\n- $1 detail/" "$T/work/CHANGELOG.md"; }

ok() { echo "  ok   $1"; }
bad() { echo "  FAIL $1"; fails=$((fails + 1)); }
check() { if eval "$2"; then ok "$1"; else bad "$1"; fi; }

# --- fixture ------------------------------------------------------------------
git init -q --bare -b main "$T/origin.git"
git clone -q "$T/origin.git" "$T/work" 2>/dev/null
g checkout -qb main
printf '# Changelog\n\n## old entry\n- x\n' >"$T/work/CHANGELOG.md"
printf 'line1\nline2\n' >"$T/work/app.txt"
commit_all base
g push -q origin main
base=$(g rev-parse HEAD)

branch() { g checkout -qb "$1" "$2"; } # name start-point

# 1: changelog append on main's base → auto-resolve against main.
branch pr-a "$base"; add_entry "A entry"; commit_all A
# 2: stacked on pr-a, its own append → cascades from pr-a's new head.
branch pr-b pr-a; add_entry "B entry"; echo b >"$T/work/b.txt"; commit_all B
# 3: edits the SAME existing changelog line main edits → must not resolve.
branch pr-c "$base"; sed -i 's/^- x$/- x (C)/' "$T/work/CHANGELOG.md"; commit_all C
# 4: changelog append plus a code conflict → not changelog-only.
branch pr-d "$base"; add_entry "D entry"; sed -i 's/line2/D2/' "$T/work/app.txt"; commit_all D
# 5: changelog-only but opted out.
branch pr-e "$base"; add_entry "E entry"; commit_all E
# 6: no conflict at all.
branch pr-f "$base"; echo f >"$T/work/f.txt"; commit_all F
# 7: changelog-only, already labelled from an earlier run.
branch pr-g "$base"; add_entry "G entry"; commit_all G
# 8: changelog-only, but its branch moves after the PR ref is read.
branch pr-h "$base"; add_entry "H entry"; commit_all H

g push -q origin pr-a pr-b pr-c pr-d pr-e pr-f pr-g pr-h
for i in a b c d e f g h; do
  n=$(($(printf '%d' "'$i") - 96))
  git -C "$T/origin.git" update-ref "refs/pull/$n/head" "$(g rev-parse "pr-$i")"
done
# pr-h moves on origin; refs/pull/8/head still points at the old tip.
g checkout -q pr-h; echo late >"$T/work/late.txt"; commit_all "late push"; g push -q origin pr-h

# main moves on: its own changelog entry, an edit to "- x", and a code edit.
g checkout -q main
add_entry "main entry"
sed -i 's/^- x$/- x (main)/' "$T/work/CHANGELOG.md"
sed -i 's/line2/main2/' "$T/work/app.txt"
commit_all "main moves on"
g push -q origin main

pr() { # number head base [labels...]
  local n=$1 head=$2 base=$3; shift 3
  jq -n --argjson n "$n" --arg h "$head" --arg b "$base" \
    '{number:$n, headRefName:$h, baseRefName:$b, isCrossRepository:false,
      labels:[$ARGS.positional[] | {name:.}]}' --args "$@"
}
{
  pr 1 pr-a main
  pr 2 pr-b pr-a
  pr 3 pr-c main
  pr 4 pr-d main
  pr 5 pr-e main no-auto-resolve
  pr 6 pr-f main
  pr 7 pr-g main conflicts-with-main
  pr 8 pr-h main
} | jq -s . >"$T/prs.json"

mkdir "$T/bin"
cat >"$T/bin/gh" <<EOF
#!/usr/bin/env bash
if [[ "\$1 \$2" == "pr list" ]]; then cat "$T/prs.json"; exit; fi
# One line per call, so a comment body can be matched with its PR number.
printf '%s\n' "\$*" | tr '\n' ' ' >>"$T/gh.log"; echo >>"$T/gh.log"
EOF
chmod +x "$T/bin/gh"
: >"$T/gh.log"

# Snapshot what the script must leave alone. These, and `log` below, are read
# inside the eval'd assertion strings, which shellcheck cannot see into.
before() { git -C "$T/origin.git" rev-parse "$1"; }
# shellcheck disable=SC2034
c_before=$(before pr-c) d_before=$(before pr-d) e_before=$(before pr-e)
# shellcheck disable=SC2034
f_before=$(before pr-f) h_before=$(before pr-h) a_before=$(before pr-a)

# --- run ----------------------------------------------------------------------
echo "Running check-stack-conflicts.sh against the fixture…"
(cd "$T/work" && PATH="$T/bin:$PATH" bash "$SCRIPT") >"$T/out.log" 2>&1 ||
  { cat "$T/out.log"; echo "script exited non-zero"; exit 1; }
sed 's/^/  | /' "$T/out.log"

o() { git -C "$T/origin.git" "$@"; }
show() { o show "$1:CHANGELOG.md"; }
# shellcheck disable=SC2034
log=$(cat "$T/gh.log")

echo "Assertions:"
# 1
check "#1 pushed a merge onto pr-a" '[[ $(o rev-parse pr-a) != "$a_before" ]] && o merge-base --is-ancestor main pr-a'
check "#1 keeps both entries, no markers" 'show pr-a | grep -q "## A entry" && show pr-a | grep -q "## main entry" && ! show pr-a | grep -q "^<<<<<<<"'
check "#1 separates the two entries with a blank line" 'show pr-a | grep -A1 -x -- "- A entry detail" | tail -1 | grep -qx ""'
check "#1 keeps main's edit to an existing line" 'show pr-a | grep -qx -- "- x (main)"'
check "#1 commented, no conflict label" 'grep -q "^pr comment 1 .*Auto-resolved" <<<"$log" && ! grep -q "^pr edit 1 --add-label" <<<"$log"'
# 2
check "#2 merged pr-a's new head, not main directly" 'o merge-base --is-ancestor pr-a pr-b && [[ $(o log -1 --format=%s pr-b) == "Merge pr-a into pr-b" ]]'
check "#2 diff against its base is only its own change" '[[ $(o diff --name-only pr-a pr-b | LC_ALL=C sort | paste -sd,) == "CHANGELOG.md,b.txt" ]]'
check "#2 keeps all three entries" 'show pr-b | grep -q "## B entry" && show pr-b | grep -q "## A entry" && show pr-b | grep -q "## main entry"'
# 3
check "#3 not pushed" '[[ $(o rev-parse pr-c) == "$c_before" ]]'
check "#3 labelled, and the comment says why" 'grep -q "^pr edit 3 --add-label conflicts-with-main" <<<"$log" && grep -q "^pr comment 3 .*both sides edited the same existing lines" <<<"$log"'
# 4
check "#4 not pushed (code conflict)" '[[ $(o rev-parse pr-d) == "$d_before" ]]'
check "#4 labelled and commented" 'grep -q "^pr edit 4 --add-label" <<<"$log" && grep -q "^pr comment 4 .*app.txt" <<<"$log"'
# 5
check "#5 opt-out respected" '[[ $(o rev-parse pr-e) == "$e_before" ]] && grep -q "^pr edit 5 --add-label" <<<"$log"'
# 6
check "#6 clean PR untouched and silent" '[[ $(o rev-parse pr-f) == "$f_before" ]] && ! grep -q "^pr [a-z]* 6 " <<<"$log"'
# 7
check "#7 resolved, label removed, single comment" 'grep -q "^pr edit 7 --remove-label" <<<"$log" && [[ $(grep -c "^pr comment 7 " <<<"$log") == 1 ]] && grep -q "^pr comment 7 .*Auto-resolved" <<<"$log"'
# 8
check "#8 moved branch not overwritten" '[[ $(o rev-parse pr-h) == "$h_before" ]]'
check "#8 reports the rejected push" 'grep -q "^pr comment 8 .*push was rejected" <<<"$log"'

echo
if [[ $fails == 0 ]]; then echo "All assertions passed."; else echo "$fails assertion(s) failed."; exit 1; fi
