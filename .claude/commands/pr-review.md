---
description: Production React/Next + API review of a GitHub PR via the react-doctor and api-doctor reviewers
argument-hint: <pr_number>
allowed-tools: Bash(gh pr view:*), Bash(gh pr diff:*), Read, Grep, Glob, Task
---

Run a production-grade pull-request review for the iLokal Next.js app. Two
specialized reviewers run together: **react-doctor** (React-in-Next.js
correctness) and **api-doctor** (API routes, Server Actions, Supabase/SQL,
migrations, validation). PR number: $ARGUMENTS

## Steps

1. If `$ARGUMENTS` is empty, stop and ask for a PR number.
2. Resolve the PR (stop and report if either command errors or the PR is missing):
   - `gh pr view $ARGUMENTS --json number,title,author,body,files,additions,deletions,baseRefName,headRefName`
   - `gh pr diff $ARGUMENTS`
3. Scope: the diff only. Ignore generated/vendored files — `lib/types/database.ts`,
   `yarn.lock`, `*.snap`, anything under `.next/`.
4. Dispatch **both** reviewers concurrently (two `Task` calls in one message) —
   pass each the PR metadata + full diff, instruction: "Review this diff. Return
   findings only, in the required format." Each reviewer stays in its own lane;
   both see the whole diff.
5. Merge the two findings lists. Dedupe by `file:line` + problem (keep the
   higher severity). Sort most-severe first.
6. Print the report (below).

## Output

- **PR** — #number, title, author, +additions/-deletions, one-line intent.
- **Verdict** — ✅ Approve / 🔄 Request changes / ⛔ Blocked. Blocked if either
  reviewer returns a ⛔; request-changes if either has 🔴; else approve. One-line
  reason.
- **Findings** — merged, grouped by severity, most-severe first:
  `path:line — <⛔|🔴|🟡|⚪> <severity>: <problem>. Fix: <change>.` — tag each with
  its source `[react]` or `[api]`.
- **What's good** — one or two honest lines. No filler.

## Rules

- Diff-scoped: never flag unchanged code.
- Every finding needs `file:line` + a concrete fix. No vague "consider".
- Do NOT post to GitHub or modify files — terminal output only, unless the user
  explicitly asks to post afterward.
- If a claim needs runtime verification (behavior, a value at runtime), say so —
  don't assert it as fact.
- If the diff is large, review file-by-file; never silently truncate — say what
  was skipped.
