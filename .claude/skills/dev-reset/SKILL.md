# Dev Reset Skill

Reset the local database, apply seeds, and start the dev server. Follow the steps below exactly. Each step has error detection and a user checkpoint before proceeding.

---

## Step 1 — `make migrate-reset`

Run `make migrate-reset` (stops Supabase, wipes DB, re-applies all migrations).

**Capture the full output.** After it exits, analyze for critical signals:

- **Hard error signals:** `ERROR`, `FATAL`, `panic`, `failed`, `migration.*failed`, `duplicate key`, `already exists`, `syntax error`, `relation.*does not exist`, non-zero exit code
- **Soft warnings (acceptable):** `NOTICE`, `INFO`, `skipping`, deprecation messages

**Decision tree:**

- If the command exits with a **non-zero exit code OR output contains a hard error signal** →
  1. Display a formatted error block showing: which migration failed, the exact error line(s), and exit code.
  2. **Stop and ask the user:**
     > ⚠️ **Migration failed.** Options:
     >
     > - `fix` — I'll wait while you fix the migration and we retry
     > - `skip` — continue to seeding anyway (risky; DB may be in broken state)
     > - `abort` — stop the reset entirely
  3. Wait for the user's choice before continuing.

- If the command exits **cleanly with no hard errors** →
  - Print a one-line success summary: `✓ Migrations applied (N files)` — count from output if visible.
  - Proceed to Step 2.

---

## Step 2 — `make seed`

Run `make seed` to populate storage buckets (logos, avatars, product images) and re-seed all database rows.

> **Note:** `make seed` = `seed-storage` + `seed-db`. `migrate-reset` already ran the SQL seeds via `supabase db reset`, so `seed-db` re-runs them idempotently (ON CONFLICT clauses make it safe). The critical part here is `seed-storage`, which uploads images into local Supabase Storage — that is NOT run by `migrate-reset`.

**Capture the full output.** After it exits, analyze for:

- **Hard error signals:** `ERROR`, `FATAL`, `syntax error`, `violates.*constraint`, `duplicate key`, `relation.*does not exist`, `permission denied`, `curl: (7)`, non-zero exit code
- **Soft warnings (acceptable):** `NOTICE`, `INSERT 0` (empty seed), `already exists (skipped)` (storage idempotency)

**Decision tree:**

- If the command exits with a **non-zero exit code OR output contains a hard error signal** →
  1. Display a formatted error block: which seed file or upload failed, the exact error line(s), and exit code.
  2. **Stop and ask the user:**
     > ⚠️ **Seeding failed.** Options:
     >
     > - `fix` — I'll wait while you fix the seed file and we retry from this step
     > - `skip` — continue to dev server anyway (dev data will be missing or partial)
     > - `abort` — stop the reset entirely
  3. Wait for the user's choice before continuing.

- If the command exits **cleanly with no hard errors** →
  - Print a one-line success summary: `✓ Seeds loaded (storage + DB)`.
  - Proceed to Step 3.

---

## Step 3 — `make run-dev`

Run `make run-dev` in the **background** (starts Supabase + Next.js dev server).

Monitor the output stream until one of the following is detected:

- **Ready signal:** `Local:`, `http://localhost`, `Ready in`, `✓ Ready` → report the URLs and confirm dev server is up.
- **Startup error:** `Error:`, `EADDRINUSE`, `Module not found`, `TypeError`, `SyntaxError`, `Failed to compile` within the first 60 seconds → surface the error snippet and warn the user that the server may not have started correctly.

After reporting ready or warning, leave the process running in the background and return control to the user.

---

## Final status report

After all steps complete (or are skipped/aborted), print a concise status table:

```
Step               Status    Notes
─────────────────────────────────────────────────────
1. migrate-reset   ✓/✗/—     (brief note)
2. seed            ✓/✗/—     (brief note)
3. run-dev         ✓/✗/—     URLs or error
```

If any step failed or was skipped, add a short **"Action needed"** section listing what the user should do next.
