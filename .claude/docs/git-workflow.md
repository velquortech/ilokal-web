# Git Workflow — iLokal Web

## Conventional Commits

Format: `type(scope): description`

| Type | When to use |
|---|---|
| `feat` | New feature or user-facing addition |
| `fix` | Bug fix |
| `chore` | Tooling, deps, config, seeds, migrations (no production logic change) |
| `refactor` | Code change with no behaviour change |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace — no logic change |

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

## Commit Co-authorship

When commits are AI-assisted, append:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## Changelog

Update `.claude/CHANGELOG.md` after any major agent-driven change. Format:

```markdown
## YYYY-MM-DD — Short summary

- What changed and why
- Risk level
- Acceptance criteria
```
