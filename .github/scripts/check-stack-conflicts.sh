#!/usr/bin/env bash
# Flag open PRs — stacked ones included — whose head no longer merges into main.
#
# GitHub's own "This branch has conflicts" only compares a PR with its BASE. A
# stacked PR (#89 on #87 on main) therefore stays green while the bottom of the
# stack quietly stops merging into main, and nobody finds out until merge day.
# This test-merges every open PR's head into main with `git merge-tree` (no
# checkout, no worktree), which for a stacked PR covers the whole stack below
# it — the question that matters: "will this still land on main?"
#
# Reporting, per PR:
#   * label `conflicts-with-main` on every PR that conflicts;
#   * ONE comment per stack, on the lowest conflicting PR, naming the PRs above
#     it — one conflict at the bottom of a three-PR stack is one notification,
#     not three;
#   * when a labelled PR merges cleanly again, the label comes off with a note.
# Already-labelled PRs are not re-commented, so repeat runs stay quiet.
#
# Env: GH_TOKEN (gh auth), MAIN_REF (default origin/main), DRY_RUN=1 to print
# the actions instead of taking them. Needs git >= 2.38 (merge-tree
# --write-tree), gh and jq.

set -euo pipefail

MAIN_BRANCH="${MAIN_BRANCH:-main}"
MAIN_REF="${MAIN_REF:-origin/$MAIN_BRANCH}"
LABEL="conflicts-with-main"
DRY_RUN="${DRY_RUN:-0}"

run() {
  if [[ "$DRY_RUN" == 1 ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    echo
  else
    "$@"
  fi
}

git fetch --quiet origin "+refs/heads/$MAIN_BRANCH:refs/remotes/origin/$MAIN_BRANCH"

prs=$(gh pr list --state open --limit 200 \
  --json number,headRefName,baseRefName,labels)
count=$(jq length <<<"$prs")
echo "Checking $count open PR(s) against $MAIN_REF ($(git rev-parse --short "$MAIN_REF"))"
[[ "$count" == 0 ]] && exit 0

# refs/pull/N/head works for branches and forks alike.
jq -r '.[].number' <<<"$prs" |
  sed 's|.*|+refs/pull/&/head:refs/stack-check/&|' |
  xargs git fetch --quiet origin

declare -A conflicted=() files_of=() labelled=() pr_by_branch=() base_of=()
while IFS=$'\t' read -r n head base has_label; do
  pr_by_branch[$head]=$n
  base_of[$n]=$base
  labelled[$n]=$has_label
done < <(jq -r --arg l "$LABEL" \
  '.[] | [.number, .headRefName, .baseRefName, ([.labels[].name] | index($l) != null)] | @tsv' \
  <<<"$prs")

for n in "${!base_of[@]}"; do
  set +e
  out=$(git merge-tree --write-tree --name-only --no-messages \
    "$MAIN_REF" "refs/stack-check/$n" 2>&1)
  rc=$?
  set -e
  case $rc in
    0) ;;
    1)
      conflicted[$n]=1
      # Line 1 is the tree id; the conflicted paths follow.
      files_of[$n]=$(tail -n +2 <<<"$out" | sed '/^$/d' | sort -u)
      ;;
    *) echo "::warning::#$n: merge-tree failed (exit $rc): $out" ;;
  esac
done

# Parent PR of $1 within the stack, or empty when it sits on main / a non-PR.
parent_of() {
  local base=${base_of[$1]}
  [[ "$base" == "$MAIN_BRANCH" ]] && return 0
  echo "${pr_by_branch[$base]:-}"
}

# Conflicting PRs stacked (directly or transitively) on $1.
conflicting_above() {
  local root=$1 n p
  for n in "${!conflicted[@]}"; do
    p=$(parent_of "$n")
    while [[ -n "$p" ]]; do
      if [[ "$p" == "$root" ]]; then echo "$n"; break; fi
      p=$(parent_of "$p")
    done
  done | sort -n
}

# Stack chain from main up to $1, e.g. "main ← #87 ← #89".
chain_of() {
  local n=$1 chain="#$1" p
  p=$(parent_of "$n")
  while [[ -n "$p" ]]; do chain="#$p ← $chain"; p=$(parent_of "$p"); done
  local bottom=${chain%% *}
  echo "${base_of[${bottom#\#}]} ← $chain"
}

main_sha=$(git rev-parse --short "$MAIN_REF")
main_subject=$(git log -1 --format=%s "$MAIN_REF")

if [[ ${#conflicted[@]} -gt 0 ]]; then
  run gh label create "$LABEL" --color B60205 \
    --description "Head no longer merges cleanly into main (stack-aware check)" --force
fi

for n in $(printf '%s\n' "${!base_of[@]}" | sort -n); do
  if [[ -n "${conflicted[$n]:-}" ]]; then
    echo "#$n CONFLICTS with $MAIN_BRANCH: $(tr '\n' ' ' <<<"${files_of[$n]}")"
    [[ "${labelled[$n]}" == true ]] && continue
    run gh pr edit "$n" --add-label "$LABEL"

    p=$(parent_of "$n")
    # The comment belongs to the lowest conflicting PR of the stack.
    [[ -n "$p" && -n "${conflicted[$p]:-}" ]] && continue

    body="**This PR no longer merges cleanly into \`$MAIN_BRANCH\`** after $main_sha (${main_subject})."
    body+=$'\n\n'"Stack: $(chain_of "$n")"
    body+=$'\n\n'"Conflicting files:"$'\n'
    body+=$(sed 's/.*/- `&`/' <<<"${files_of[$n]}")
    above=$(conflicting_above "$n" | sed 's/^/#/' | paste -sd ' ' -)
    if [[ -n "$above" ]]; then
      body+=$'\n\n'"Also blocked further up this stack: $above. Merge \`$MAIN_BRANCH\` into this branch first, then merge it down the stack."
    elif [[ -n "$p" ]]; then
      body+=$'\n\n'"The PRs below this one still merge cleanly, so the conflict comes from this PR's own changes."
    elif [[ "${base_of[$n]}" != "$MAIN_BRANCH" ]]; then
      body+=$'\n\n'"Base \`${base_of[$n]}\` has no open PR of its own, so the conflict may come from that branch rather than this PR."
    fi
    body+=$'\n\n'"<sub>Posted by the stack-conflicts workflow. The \`$LABEL\` label is removed automatically once this merges cleanly again.</sub>"
    run gh pr comment "$n" --body "$body"
  else
    echo "#$n merges cleanly into $MAIN_BRANCH"
    if [[ "${labelled[$n]}" == true ]]; then
      run gh pr edit "$n" --remove-label "$LABEL"
      run gh pr comment "$n" --body "✅ Merges cleanly into \`$MAIN_BRANCH\` again (as of $main_sha). Removed \`$LABEL\`."
    fi
  fi
done
