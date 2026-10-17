#!/usr/bin/env bash
# Flag open PRs — stacked ones included — whose head no longer merges into main,
# and auto-resolve the ones whose only conflicts are changelog entries.
#
# GitHub's own "This branch has conflicts" only compares a PR with its BASE. A
# stacked PR (#89 on #87 on main) therefore stays green while the bottom of the
# stack quietly stops merging into main, and nobody finds out until merge day.
# This test-merges every open PR's head into main with `git merge-tree` (no
# checkout), which for a stacked PR covers the whole stack below it — the
# question that matters: "will this still land on main?"
#
# Auto-resolve. When EVERY conflicting file matches AUTO_RESOLVE_PATTERN
# (changelogs, release notes) the conflict is two people appending entries, and
# the right resolution is mechanical: keep both. The script merges and pushes
# that itself, but only when it is provably the append case:
#   * each conflict hunk must be a pure addition on both sides (its merge-base
#     section is empty). Two edits to the SAME existing lines are a real
#     conflict — "keep both" would duplicate the paragraph — so those are left
#     to a human, like any other conflict;
#   * a PR based on main gets main merged in; a stacked PR gets its parent's
#     freshly resolved head merged in instead, so main never shows up in the
#     stacked PR's own diff. Stacks are processed bottom-up so this cascades;
#   * the result must merge cleanly into main before anything is pushed, and the
#     push is a plain fast-forward: if the branch moved meanwhile, it fails and
#     nothing is overwritten;
#   * fork PRs and PRs labelled `no-auto-resolve` are never pushed to.
#
# Reporting, per PR still conflicting after that:
#   * label `conflicts-with-main` on every PR that conflicts;
#   * ONE comment per stack, on the lowest conflicting PR, naming the PRs above
#     it — one conflict at the bottom of a three-PR stack is one notification,
#     not three;
#   * when a labelled PR merges cleanly again, the label comes off with a note.
# Already-labelled PRs are not re-commented, so repeat runs stay quiet.
#
# Env: GH_TOKEN (gh auth); the git remote's own credentials are what pushes.
#   MAIN_REF             default origin/main
#   AUTO_RESOLVE         default 1; 0 disables pushing entirely
#   AUTO_RESOLVE_PATTERN ERE over repo paths
#   DRY_RUN=1            print the actions instead of taking them (merges are
#                        still computed, locally, so the output is real)
# Needs git >= 2.38 (merge-tree --write-tree), gh and jq.
# Tests: .github/scripts/test-check-stack-conflicts.sh

set -euo pipefail

MAIN_BRANCH="${MAIN_BRANCH:-main}"
MAIN_REF="${MAIN_REF:-origin/$MAIN_BRANCH}"
LABEL="conflicts-with-main"
OPT_OUT_LABEL="no-auto-resolve"
DRY_RUN="${DRY_RUN:-0}"
AUTO_RESOLVE="${AUTO_RESOLVE:-1}"
AUTO_RESOLVE_PATTERN="${AUTO_RESOLVE_PATTERN:-(^|/)CHANGELOG\.md$|^docs/release-notes/}"

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
  --json number,headRefName,baseRefName,labels,isCrossRepository)
count=$(jq length <<<"$prs")
echo "Checking $count open PR(s) against $MAIN_REF ($(git rev-parse --short "$MAIN_REF"))"
[[ "$count" == 0 ]] && exit 0

# refs/pull/N/head works for branches and forks alike.
jq -r '.[].number' <<<"$prs" |
  sed 's|.*|+refs/pull/&/head:refs/stack-check/&|' |
  xargs git fetch --quiet origin

declare -A conflicted=() files_of=() labelled=() opted_out=() is_fork=() \
  pr_by_branch=() base_of=() head_of=() resolved=() resolved_files=() skip_reason=()
while IFS=$'\t' read -r n head base has_label has_opt_out fork; do
  pr_by_branch[$head]=$n
  head_of[$n]=$head
  base_of[$n]=$base
  labelled[$n]=$has_label
  opted_out[$n]=$has_opt_out
  is_fork[$n]=$fork
done < <(jq -r --arg l "$LABEL" --arg o "$OPT_OUT_LABEL" \
  '.[] | [.number, .headRefName, .baseRefName,
          ([.labels[].name] | index($l) != null),
          ([.labels[].name] | index($o) != null),
          .isCrossRepository] | @tsv' \
  <<<"$prs")

# Sets conflicted[$1] / files_of[$1] from a test merge of $2 into main.
check_against_main() {
  local n=$1 rev=$2 out rc
  set +e
  out=$(git merge-tree --write-tree --name-only --no-messages "$MAIN_REF" "$rev" 2>&1)
  rc=$?
  set -e
  unset 'conflicted[$n]' 'files_of[$n]'
  case $rc in
    0) ;;
    1)
      conflicted[$n]=1
      # Line 1 is the tree id; the conflicted paths follow.
      files_of[$n]=$(tail -n +2 <<<"$out" | sed '/^$/d' | sort -u)
      ;;
    *) echo "::warning::#$n: merge-tree failed (exit $rc): $out" ;;
  esac
}

for n in "${!base_of[@]}"; do
  check_against_main "$n" "refs/stack-check/$n"
done

# Parent PR of $1 within the stack, or empty when it sits on main / a non-PR.
parent_of() {
  local base=${base_of[$1]}
  [[ "$base" == "$MAIN_BRANCH" ]] && return 0
  echo "${pr_by_branch[$base]:-}"
}

depth_of() {
  local d=0 p
  p=$(parent_of "$1")
  while [[ -n "$p" ]]; do d=$((d + 1)); p=$(parent_of "$p"); done
  echo "$d"
}

# --- Auto-resolve -------------------------------------------------------------

# Conflict markers are matched by plain string prefix, not regex intervals:
# mawk (Ubuntu's default awk) panics on `<{20}( |$)` and prints nothing.
MARKER_AWK='
  function rep(c,   s, i) { s = ""; for (i = 0; i < 20; i++) s = s c; return s }
  function is_marker(c) {
    return substr($0, 1, 20) == rep(c) && (length($0) == 20 || substr($0, 21, 1) == " ")
  }
'

# Rewrite each conflict block of a 20-wide diff3 file as ours-then-theirs,
# with a blank line between them when neither side brings one — two entries
# appended at the same spot otherwise come out glued together. Only called
# once every block's base section is known to be empty.
keep_both() {
  awk "$MARKER_AWK"'
    is_marker("<") { state = "ours"; no = nt = 0; next }
    state == "ours" && is_marker("|") { state = "base"; next }
    state != "" && $0 == rep("=") { state = "theirs"; next }
    state == "theirs" && is_marker(">") {
      for (i = 1; i <= no; i++) print o[i]
      if (no && nt && o[no] != "" && t[1] != "") print ""
      for (i = 1; i <= nt; i++) print t[i]
      state = ""; next
    }
    state == "ours" { o[++no] = $0; next }
    state == "theirs" { t[++nt] = $0; next }
    state == "base" { next }
    { print }
    END { if (state != "") exit 2 }
  '
}

# Resolve every unmerged path in the worktree $1 by keeping both sides, or
# fail (non-zero, reason on stdout) if any of them is not a safe append.
resolve_appends() {
  local wt=$1 f tmp
  tmp=$(mktemp -d)
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if ! grep -Eq "$AUTO_RESOLVE_PATTERN" <<<"$f"; then
      echo "\`$f\` is not a changelog or release-note file"
      return 1
    fi
    # Stage 1 = merge base, 2 = ours, 3 = theirs. A missing 2 or 3 means a
    # delete/modify conflict, which "keep both" cannot express.
    if ! git -C "$wt" show ":2:$f" >"$tmp/ours" 2>/dev/null ||
      ! git -C "$wt" show ":3:$f" >"$tmp/theirs" 2>/dev/null; then
      echo "\`$f\` was deleted on one side"
      return 1
    fi
    git -C "$wt" show ":1:$f" >"$tmp/base" 2>/dev/null || : >"$tmp/base"
    # In diff3 output, a hunk's base section sits between `|||||||` and
    # `=======`. Any line there means both sides edited existing text.
    # merge-file exits non-zero whenever it reports a conflict — which is every
    # time here — so it must not be piped: under pipefail its status would mask
    # awk's verdict and wave every edit through as an append.
    # Markers are 20 wide so a Markdown `=======` underline can never pass
    # for one.
    git merge-file -p --diff3 --marker-size=20 \
      "$tmp/ours" "$tmp/base" "$tmp/theirs" >"$tmp/diff3" || true
    if awk "$MARKER_AWK"'
      is_marker("|") { inb = 1; next }
      $0 == rep("=") { inb = 0 }
      inb { bad = 1 }
      END { exit !bad }
    ' "$tmp/diff3"; then
      echo "both sides edited the same existing lines of \`$f\`"
      return 1
    fi
    if ! keep_both <"$tmp/diff3" >"$wt/$f"; then
      echo "could not rewrite the conflict blocks of \`$f\`"
      return 1
    fi
    git -C "$wt" add -- "$f"
  done < <(git -C "$wt" diff --name-only --diff-filter=U)
  rm -rf "$tmp"
}

# Merge $2 into PR $1's head and push it. On success sets resolved[$1] to the
# new head; on failure sets skip_reason[$1].
auto_resolve() {
  local n=$1 target=$2 target_label=$3 wt reason new_head
  wt=$(mktemp -d)
  git worktree add --quiet --detach "$wt" "refs/stack-check/$n"
  # Hooks belong to humans' commits; a CI merge must not run them.
  if git -C "$wt" -c core.hooksPath=/dev/null merge --quiet --no-ff --no-edit \
    -m "Merge $target_label into ${head_of[$n]}" "$target" >/dev/null 2>&1; then
    reason=""
  elif reason=$(resolve_appends "$wt"); then
    git -C "$wt" -c core.hooksPath=/dev/null commit --quiet --no-edit
    reason=""
  fi

  if [[ -z "$reason" ]]; then
    new_head=$(git -C "$wt" rev-parse HEAD)
    if ! git merge-tree --write-tree "$MAIN_REF" "$new_head" >/dev/null 2>&1; then
      reason="the merged result still conflicts with \`$MAIN_BRANCH\`"
    fi
  fi
  if [[ -z "$reason" ]] &&
    ! run git push --quiet origin "$new_head:refs/heads/${head_of[$n]}"; then
    reason="the push was rejected (the branch probably moved; the next run will retry)"
  fi

  git -C "$wt" merge --abort >/dev/null 2>&1 || true
  git worktree remove --force "$wt"
  if [[ -n "$reason" ]]; then
    skip_reason[$n]=$reason
    return 1
  fi
  resolved[$n]=$new_head
}

if [[ "$AUTO_RESOLVE" == 1 ]]; then
  git config user.name >/dev/null || git config user.name "github-actions[bot]"
  git config user.email >/dev/null ||
    git config user.email "41898283+github-actions[bot]@users.noreply.github.com"

  # Bottom-up, so a parent's new head exists before its children merge it.
  for n in $(for k in "${!conflicted[@]}"; do echo "$(depth_of "$k") $k"; done |
    sort -n | cut -d' ' -f2); do
    # Any conflicting path outside the pattern makes it a human's conflict.
    grep -Evq "$AUTO_RESOLVE_PATTERN" <<<"${files_of[$n]}" && continue
    [[ "${is_fork[$n]}" == true || "${opted_out[$n]}" == true ]] && continue

    p=$(parent_of "$n")
    if [[ "${base_of[$n]}" == "$MAIN_BRANCH" ]]; then
      target=$MAIN_REF target_label=$MAIN_BRANCH
    elif [[ -n "$p" && -n "${resolved[$p]:-}" ]]; then
      target=${resolved[$p]} target_label=${head_of[$p]}
    else
      # Stacked on a parent that already merged cleanly (the conflict is this
      # PR's own), or on a branch with no PR: merging main here would put
      # main's commits into this PR's diff. Leave it to a human.
      continue
    fi

    echo "#$n: changelog-only conflict, merging $target_label in"
    resolved_files[$n]=${files_of[$n]}
    if auto_resolve "$n" "$target" "$target_label"; then
      check_against_main "$n" "${resolved[$n]}"
      echo "#$n auto-resolved: ${head_of[$n]} is now $(git rev-parse --short "${resolved[$n]}")"
    else
      echo "#$n not auto-resolved: ${skip_reason[$n]}"
    fi
  done
fi

# --- Reporting ----------------------------------------------------------------

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
  if [[ -n "${resolved[$n]:-}" ]]; then
    p=$(parent_of "$n")
    if [[ "${base_of[$n]}" == "$MAIN_BRANCH" ]]; then source="\`$MAIN_BRANCH\`"; else source="#$p (just updated the same way)"; fi
    body="🔀 **Auto-resolved a changelog-only conflict:** merged $source into this branch, keeping both sides' new entries"
    body+=" ($(git rev-parse --short "${resolved[$n]}"))."
    body+=$'\n\n'"Files:"$'\n'
    body+=$(sed 's/.*/- `&`/' <<<"${resolved_files[$n]}")
    body+=$'\n\n'"Pull before you push again: \`git pull --no-rebase\`. If entries ended up in the wrong order, reorder them. To stop this for a PR, label it \`$OPT_OUT_LABEL\`."
    run gh pr comment "$n" --body "$body"
  fi

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
    if [[ -n "${skip_reason[$n]:-}" ]]; then
      body+=$'\n\n'"Not auto-resolved: ${skip_reason[$n]}."
    fi
    body+=$'\n\n'"<sub>Posted by the stack-conflicts workflow. The \`$LABEL\` label is removed automatically once this merges cleanly again.</sub>"
    run gh pr comment "$n" --body "$body"
  else
    [[ -z "${resolved[$n]:-}" ]] && echo "#$n merges cleanly into $MAIN_BRANCH"
    if [[ "${labelled[$n]}" == true ]]; then
      run gh pr edit "$n" --remove-label "$LABEL"
      [[ -n "${resolved[$n]:-}" ]] && continue
      run gh pr comment "$n" --body "✅ Merges cleanly into \`$MAIN_BRANCH\` again (as of $main_sha). Removed \`$LABEL\`."
    fi
  fi
done
