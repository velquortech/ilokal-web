#!/usr/bin/env bash
# cleanup-worktree.sh — remove a worktree whose branch has finished its life.
#
# The intended lifecycle: worktree branch -> commit -> push -> PR -> merge.
# Once merged, the worktree is dead weight (a second copy of the repo) and
# should be removed so the codebase stays clean. This script makes that step
# safe and repeatable — and it can be wired into CI/hooks so cleanup happens
# automatically after a successful merge.
#
# Usage:
#   ./scripts/cleanup-worktree.sh <worktree-path|branch-name> [--force] [--delete-remote]
#
#   <worktree-path>   path to the worktree to remove (e.g. .freebuff/worktrees/<id>)
#   <branch-name>     the worktree's branch (e.g. feat/foo) — resolved to its worktree
#   --force           bypass ALL safety guards (uncommitted changes, open PR,
#                     unmerged branch, locked worktree, live processes)
#   --delete-remote   also delete the branch on origin (asks nothing; requires push rights)
#
# Safety guards (each refuses unless --force):
#   * never touches the main checkout or a worktree on `main`
#   * uncommitted changes in the worktree
#   * an OPEN pull request for the branch (`gh` must be installed)
#   * branch NOT merged into `main`
#   * worktree is locked (another session owns it)
#   * a live process has its cwd inside the worktree (e.g. a dev server)
#
# Exit codes: 0 = removed, 1 = refused by a guard, 2 = usage/unknown target.

set -euo pipefail

MAIN_CHECKOUT="$(git worktree list | awk '$2 == "(main)" {print $1}')"
FORCE=0
DELETE_REMOTE=0
TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=1 ;;
    --delete-remote) DELETE_REMOTE=1 ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    -*) echo "unknown flag: $1" >&2; exit 2 ;;
    *) TARGET="$1" ;;
  esac
  shift
done

[[ -z "$TARGET" ]] && { echo "error: pass a worktree path or branch name" >&2; exit 2; }

fail() { echo "REFUSED: $1 (use --force to override)" >&2; exit 1; }

# --- Resolve the target to (path, branch) -----------------------------------
# git worktree list --porcelain emits: worktree <path> / HEAD <sha> / branch <ref>
mapfile -t LINES < <(git worktree list --porcelain)
PATH_BRANCH=()  # [path, branch] pairs
for ((i = 0; i < ${#LINES[@]}; i++)); do
  if [[ "${LINES[$i]}" == worktree\ * ]]; then
    wt="${LINES[$i]#worktree }"
    br=""
    for ((j = i + 1; j < ${#LINES[@]}; j++)); do
      [[ "${LINES[$j]}" == branch\ * ]] && { br="${LINES[$j]#branch refs/heads/}"; break; }
      [[ "${LINES[$j]}" == worktree\ * || -z "${LINES[$j]}" ]] && break
    done
    PATH_BRANCH+=("$wt|$br")
  fi
done

# Canonicalize a path target (porcelain emits absolute paths; accept relative
# ones and bare worktree ids/names too).
if [[ -d "$TARGET" ]]; then TARGET="$(cd "$TARGET" && pwd)"; fi

WT_PATH=""
BRANCH=""
for entry in "${PATH_BRANCH[@]}"; do
  wt="${entry%%|*}"; br="${entry#*|}"
  if [[ "$TARGET" == "$wt" || "$TARGET" == "$br" || "$wt" == *"$TARGET" ]]; then WT_PATH="$wt"; BRANCH="$br"; break; fi
done
[[ -z "$WT_PATH" ]] && { echo "error: no worktree found for '$TARGET'" >&2; exit 2; }

echo "Target: $WT_PATH  (branch: ${BRANCH:-<detached>})"

# --- Guards ------------------------------------------------------------------
if [[ "$WT_PATH" == "$MAIN_CHECKOUT" || "$BRANCH" == "main" ]]; then
  fail "will not remove the main checkout"
fi
if [[ -z "$BRANCH" ]]; then
  fail "worktree is on a detached HEAD (branch unknown)"
fi
if [[ $FORCE -eq 0 ]]; then
  # uncommitted changes
  if [[ -n "$(git -C "$WT_PATH" status --porcelain 2>/dev/null)" ]]; then
    fail "uncommitted changes in $WT_PATH"
  fi
  # open PR
  if command -v gh >/dev/null 2>&1 && [[ -n "$(gh pr list --head "$BRANCH" --state open --json number --jq '.[0].number // ""' 2>/dev/null)" ]]; then
    fail "branch '$BRANCH' has an open PR"
  fi
  # merged into main?
  if ! git merge-base --is-ancestor "$BRANCH" main 2>/dev/null; then
    fail "branch '$BRANCH' is NOT merged into main"
  fi
  # locked worktree (the `locked` attribute line sits below HEAD/branch in
  # porcelain output, so look several lines into the entry)
  if git worktree list --porcelain | grep -A5 "^worktree $WT_PATH$" | grep -q '^locked'; then
    fail "worktree is locked by another session"
  fi
  # live processes with cwd inside the worktree (dev servers, etc.)
  for p in /proc/[0-9]*/cwd; do
    d="$(readlink "$p" 2>/dev/null || true)"
    case "$d" in
      "$WT_PATH"|"$WT_PATH"/*) fail "process $(basename "$(dirname "$p")") is running from $WT_PATH" ;;
    esac
  done
fi

# --- Remove ------------------------------------------------------------------
echo "Removing worktree $WT_PATH ..."
git worktree remove "$WT_PATH" ${FORCE:+-f} || { echo "error: git worktree remove failed" >&2; exit 1; }
echo "Deleting local branch '$BRANCH' ..."
git branch -d "$BRANCH"
if [[ $DELETE_REMOTE -eq 1 ]]; then
  echo "Deleting remote branch 'origin/$BRANCH' ..."
  git push origin --delete "$BRANCH"
fi

echo
echo "✅ Cleanup complete — '$BRANCH' is fully gone (local branch, worktree${DELETE_REMOTE:+, remote branch})."
echo "   Run 'git worktree prune' to tidy metadata."
