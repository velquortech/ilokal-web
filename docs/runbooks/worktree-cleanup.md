# Runbook — worktree cleanup after a successful merge

**When to use:** after a worktree branch has been **committed → pushed → PR'd →
merged** into `main`. The worktree is then a dead second copy of the repo —
remove it to keep the codebase tidy.

**Tool:** `./scripts/cleanup-worktree.sh` (bash, no dependencies beyond `git`
and, for the open-PR guard, `gh`).

## The lifecycle this automates

```
worktree branch → commit → push → PR → merge → cleanup-worktree.sh → gone
```

Run it with the worktree's path or branch name:

```bash
./scripts/cleanup-worktree.sh .freebuff/worktrees/<id>      # by path
./scripts/cleanup-worktree.sh feat/my-branch                # by branch
./scripts/cleanup-worktree.sh <path> --delete-remote        # also drop origin/<branch>
```

## What it does (in order)

1. Resolves the target to a worktree path + branch.
2. **Guards** — refuses (exit 1) unless `--force`:
   - the main checkout / `main` branch — never touched
   - uncommitted changes in the worktree
   - an **open PR** for the branch (uses `gh`)
   - branch **not merged** into `main`
   - a **locked** worktree (owned by another live session)
   - a **live process** running from the worktree (e.g. a dev server — its cwd
     resolves inside the worktree)
3. `git worktree remove <path>` (force flag only when `--force`)
4. `git branch -d <branch>` — the `-d` itself re-checks the branch is merged
5. `git push origin --delete <branch>` only with `--delete-remote`

## Guard examples seen in the wild

- The `claude-security-scan` worktree is **merged but locked** by a live Claude
  session — the script refuses it. A locked worktree means another agent owns
  it; never `--force` past the lock while that session is alive.
- A worktree whose branch still has an **open PR** (e.g. `feat/pii-guard`,
  PR #60) is refused — the branch is still needed.
- A dev server running from the worktree (the Freebuff preview server) is
  refused — kill or re-register the server first.

## Post-removal

```bash
git worktree prune   # tidy any dangling worktree metadata
```

## Freebuff note

Freebuff worktrees live under `.freebuff/worktrees/<id>` (gitignored) and
`.claude/worktrees/` (Claude's). The script treats them identically. Removing
a worktree **kills any preview/dev server running from it** — the guard exists
so you don't do that by accident.
