# Git Workflow — iLokal Web

## Conventional Commits

Format: `type(scope): description`

| Type       | When to use                                                           |
| ---------- | --------------------------------------------------------------------- |
| `feat`     | New feature or user-facing addition                                   |
| `fix`      | Bug fix                                                               |
| `chore`    | Tooling, deps, config, seeds, migrations (no production logic change) |
| `refactor` | Code change with no behaviour change                                  |
| `docs`     | Documentation only                                                    |
| `test`     | Adding or updating tests                                              |
| `perf`     | Performance improvement                                               |
| `style`    | Formatting, whitespace — no logic change                              |

Scope is optional but encouraged: `feat(registration): add barangay cascade dropdown`

Breaking changes: append `!` after the type — `feat(api)!: rename shop_name field in mobile response`

## Branch Naming

```
feat/short-description
fix/short-description
chore/short-description
refactor/short-description
```

Use kebab-case. Keep descriptions to 3–5 words max.
Feature branches tied to a ticket: `feat-<ticket>/description` (e.g. `feat-10/business-registration`).

## Rules

- Branch from `develop` for features; branch from `main` for hotfixes.
- Never commit directly to `main` or `develop`.
- One logical change per commit. Do not bundle unrelated changes.
- PR title must follow the same Conventional Commits format as commits.
- Squash-merge PRs into `develop` to keep history clean.
- After merging, delete the feature branch.

## Merging from develop

When your branch is outdated from `develop`:

```bash
git fetch origin develop
git merge origin/develop
```

Prefer `merge` over `rebase` for shared feature branches — rebase rewrites history others may have pulled.

**Conflict resolution priority:**

1. `modify/delete` conflicts: keep your version unless the deletion was an intentional refactor.
2. `package.json` dependencies: keep the superset (your branch usually has more deps).
3. Migration files: never modify existing migration files — create a new one instead.
4. Seed files: prefer the idempotent version (`ON CONFLICT DO NOTHING`).
5. Lock files (`yarn.lock`, `package-lock.json`): regenerate with `npm install` after resolving `package.json`.

## High-Risk Changes — Require Human Approval Before Merge

- Schema changes (new migration files)
- API contract changes (request/response shape)
- Auth flow changes
- Environment variable additions or renames
- Changes to `proxy/` middleware or `config/` Supabase clients

Flag these in the PR description with a **Risk:** line and include rollback steps.

## 🔒 Security Gate — Check BEFORE Pushing or Merging to `main`

**Standing rule: rate limiting and the other abuse/authz controls are a
first-class merge gate, not a nice-to-have.** Every push to a shared branch and
every merge to `main` is checked against this list, and any audit or test pass
treats it as a priority item. A feature that works but ships an unguarded
mutating endpoint is **not done**.

Run through this whenever a PR touches a route handler, a Server Action, RLS, or
a migration. Answer each with a file reference, not a recollection.

- [ ] **Rate limiting.** Does every new/changed mutating endpoint have a guard?
      `/api/web/**` and `/api/admin/**` are **NOT** covered by the proxy — a
      route there is unthrottled by default. Server-Action POSTs never reach the
      proxy limiter either. See the coverage table in
      [security.md](security.md#-rate-limiting--abuse-protection).
- [ ] **The guard is keyed on a verified identity** (session user / verified IP),
      never a client-supplied id, and doors that should share a budget share a
      key namespace — otherwise rotating between them multiplies the allowance.
- [ ] **The guard runs between auth and work**, before any expensive step
      (`request.formData()`, image re-encode, fan-out, email send), and fails
      closed when the identity is missing.
- [ ] **Authorization at the handler**, not RLS alone — `assertAuthorized` /
      `verifyBusinessOwner` with the **route segment's** id (a bare
      `verifyBusinessOwner()` falls back to whichever shop `.limit(1)` returns).
- [ ] **Input validated with Zod** before it reaches PostgREST; `z.guid()` for
      ids, never `z.uuid()`.
- [ ] **No driver text in a client response** — 500 paths go through
      `loggedServerError`; Server Action catches call `logActionError`.
- [ ] **No secret gains a `NEXT_PUBLIC_` prefix**, and no new Supabase import
      lands in a `.tsx`.
- [ ] **RLS**: new policies wrap auth calls as `(select auth.uid())`; a `FOR ALL`
      policy has an explicit `WITH CHECK`; SECURITY DEFINER functions pin
      `search_path` and REVOKE from `PUBLIC`/`anon`/`authenticated`.
- [ ] **A contract test pins whatever you just fixed**, so the next route cannot
      regress it silently. Prove it by breaking it and watching it go red — a
      guard that has never failed is not known to work.

**If a box cannot be ticked, say so explicitly in the PR** under a
**Security:** line, with the reason and a TD- entry in
[tech-debt.md](tech-debt.md). Silence reads as "checked and fine", which is how
`/api/web` went unthrottled for months.

## Commit Co-authorship

When commits are AI-assisted, append:

```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## Changelog

Update `.claude/CHANGELOG.md` after any major agent-driven change. New entries
go at the **top** (newest first), and add a matching line to that file's index
under "In this file".

```markdown
## YYYY-MM-DD — Short summary

- What changed and why
- Risk level
- Acceptance criteria
```

### Rotation — keep the always-loaded half small

`CLAUDE.md` inlines `CHANGELOG.md` into **every** session. It reached 381 KB
(~95k tokens of fixed context per task) before being split on 2026-08-19, so
the file has a size budget, not just a format.

- **When `CHANGELOG.md` passes ~15 entries**, cut the oldest ones and paste them
  at the **top** of `.claude/CHANGELOG-ARCHIVE.md` (whole entries, byte-for-byte,
  still newest-first there), then move their index lines from "In this file" to
  "In the archive".
- **Never rewrite, compress, summarise or "correct" a past entry.** Several
  deliberately record that an earlier entry was wrong — that record is why the
  file is worth loading at all. Rotation moves text; it never edits it.
- **Never put an `@` on the archive path in `CLAUDE.md`.** The `@` prefix inlines
  a file into every session; on the archive it would silently restore the whole
  381 KB cost with the split still done.
- Both files are checked by two structural rules: entries are strictly
  newest-first, and every `## ` heading has a blank line before it. Re-runnable
  check:

```bash
# blank line before every entry heading (prints nothing when clean)
awk 'prev!="" && /^## /{print FILENAME" line "NR} {prev=$0}' \
  .claude/CHANGELOG.md .claude/CHANGELOG-ARCHIVE.md
```
