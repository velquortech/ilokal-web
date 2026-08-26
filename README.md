# Ilokal-web Installation Guide

This guide outlines how to set up and manage the Ilokal-wb repository using Make commands and Supabase.

---

## 🚀 Getting Started

Make sure the following are installed on your machine:

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (ensure it's running)

### Installation Steps

1. Install dependencies:

   ```bash
   yarn
   ```

2. Set up Supabase (this starts Docker for you — see
   [Docker](#-docker-starting-it-and-what-to-do-when-it-wont-start) if it
   can't be reached):

   ```bash
   make setup-supabase
   ```

3. Run the development server (starts the Supabase stack, then Next.js on
   <http://localhost:3000>):

   ```bash
   make run-dev
   ```

---

## 🐳 Docker: starting it, and what to do when it won't start

Everything local runs on Docker: `make setup-supabase`, `make run-dev`, and every
`migrate-*` / `seed-*` target. Most go through the Supabase CLI, which opens the
Docker daemon **socket** itself; `seed-db` calls `docker exec` directly. With the
daemon down these fail with an error that names Supabase or Postgres rather than
Docker, which sends you looking in the wrong place.

### The one command

```bash
make start-docker
```

It checks whether a daemon is reachable, starts it if it is installed but
stopped, and — when it genuinely can't be reached — prints the reason and the
fix instead of a stack trace. It is idempotent: with Docker already up it prints
one line and exits.

`make run-dev` and `make setup-supabase` run it automatically, so most of the
time you never call it yourself. The script lives at
[`scripts/start-docker.sh`](scripts/start-docker.sh).

### Starting Docker by hand

| Platform | Command |
| --- | --- |
| Linux (systemd, packaged Docker Engine) | `sudo systemctl start docker` |
| Linux (rootless install) | `systemctl --user start docker` |
| macOS (Docker Desktop) | `open -a Docker` |
| macOS (colima) | `colima start` |

Confirm it took — `docker --version` answers from the client binary alone and
reports success even with the daemon stopped, so it proves nothing:

```bash
docker info          # this is the honest check
```

To have Linux start it on every boot: `sudo systemctl enable --now docker`.

### Checking the stack

```bash
docker ps                                  # containers currently running
yarn supabase status                       # what the Supabase CLI thinks is up
yarn supabase stop --project-id ilokal-web # stop this project's stack
```

### ⚠️ Flatpak (VS Code, Cursor and friends)

If your editor is installed as a **Flatpak**, its integrated terminal is a
sandbox that never receives `/var/run/docker.sock`. Docker is invisible in there
even while it runs perfectly on the host, so `make run-dev` cannot work from that
terminal — and adding a `docker` shim to `PATH` will not help, because the
Supabase CLI opens the socket itself rather than shelling out to the `docker`
binary.

Two ways forward:

1. **Run the make targets from a host terminal** (a normal system terminal, not
   the editor's). This is the simple one.
2. **Drive the host from the sandbox**, one command at a time:

   ```bash
   flatpak-spawn --host bash -lc 'cd "$PWD" && make run-dev'
   ```

`make start-docker` detects this case, starts the *host* daemon if it is down,
and prints both options.

---

## ☁️ Running against the CLOUD database (no Docker)

Instead of the local Docker stack, you can run the app straight against the **hosted Supabase project** — useful when the local stack is down or you want to see real data. **No Docker required.**

**Prerequisite:** a `.env.cloud` file with the cloud credentials. It is git-ignored; the quickest way to (re)create it from the project's Vercel config is:

```bash
yarn dlx vercel env pull --environment=production > .env.cloud
```

> `yarn dlx` is the form this repo mandates (`npx` is forbidden — see CLAUDE.md).
> Verified working here on yarn `1.22.22`, where `dlx` resolves through the Berry
> shim. If your shell reports `Command "dlx" not found`, enable corepack
> (`corepack enable`) rather than falling back to `npx`.

> If you overwrite the file this way, re-add three keys afterwards: `SUPABASE_SERVICE_ROLE_KEY` (Vercel returns it as `[SENSITIVE]` — grab the real value from **Project Settings → API** in the Supabase dashboard, or fetch it with the CLI: `yarn supabase projects api-keys --project-ref <ref>` (the CLI is a project dependency — the repo forbids `npx`; use `yarn dlx` for packages that are not installed)), `SUPABASE_DB_URL` (cloud Postgres connection string, percent-encoded), and `SEED_DEV_PASSWORD` (used by cloud seeding). Check the header comments in `.env.cloud` for where each comes from.

Then start the app:

```bash
make dev-cloud
```

That sources `.env.cloud` into the shell (so its values override `.env`'s local ones) and runs `next dev` — it never touches `.env`, Docker, or the local stack. It refuses to run if `NEXT_PUBLIC_SUPABASE_URL` still points at `localhost`/`127.0.0.1`.

**Manual equivalent:**

```bash
set -a; . ./.env.cloud; set +a
make run-start  # or: yarn dev
```

**Switch back to local:** `make run-dev` (starts the Docker stack and writes `.env`).

---

## 🔧 Cleaning and Stopping

- Clean all configurations and stop running containers:

  ```bash
  make clean
  ```

- Stop the database only:
  ```bash
  make stop-db
  ```

---

## ✅ Build and Lint

- Check builds and run linters:
  ```bash
  make build-app
  ```

---

## 👀 Production Preview (Local)

- Start the app in production mode locally:
  ```bash
  make start-app
  ```

---

## 🛠️ Supabase Configuration

### 📦 Create a Migration

- Create a new migration:
  ```bash
  make migrate-new name=[file-name]
  ```

### ⬆️ Apply Migrations

- Apply all pending migrations:
  ```bash
  make migrate-up
  ```

### 🔍 Migration Diff

- Check differences between local DB and migration files:
  ```bash
  make migrate-diff
  ```

### ♻️ Reset Database

- Reset and reapply migrations:
  ```bash
  make migrate-reset
  ```

### 🌱 Seed Data

After a reset the database and storage buckets are empty. Run these to populate them with development data:

- Seed everything (storage images + database rows):

  ```bash
  make seed
  ```

- Seed only the storage buckets (logos and interior photos):

  ```bash
  make seed-storage
  ```

- Seed only the database rows:
  ```bash
  make seed-db
  ```

> **Note:** All seed commands are idempotent — safe to run multiple times. Storage uploads are skipped if the file already exists; database inserts use `ON CONFLICT DO NOTHING`.

---

## ☁️ Cloud Deployment (APK Preview Build)

Use these to push the schema and seed data to a **hosted Supabase project** so the mobile APK preview build has a real backend. Unlike the local commands, these talk to the cloud project over its direct Postgres connection.

**Prerequisites**

- `psql` and the Supabase CLI installed locally.
- A Supabase cloud project, with its values from **Project Settings → Database / API**:
  - `SUPABASE_DB_URL` — direct connection string (**must be percent-encoded**, e.g. escape `@` in the password as `%40`).
  - `NEXT_PUBLIC_SUPABASE_URL` — `https://<ref>.supabase.co`.
  - `SUPABASE_SERVICE_ROLE_KEY` — service-role key (used only to upload storage objects).

**Step 1 — Export the cloud env vars** (point all of them at the cloud project, never local):

```bash
export SUPABASE_DB_URL="postgresql://postgres:<percent-encoded-pass>@<host>:5432/postgres"
export NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<cloud-service-role-key>"
```

**Step 2 — Push migrations** (creates tables + storage buckets on the cloud DB):

```bash
make migrate-cloud
```

**Step 3 — Seed data, lock down logins, and upload images:**

```bash
make seed-cloud
```

**Or do steps 2 + 3 in one command:**

```bash
make deploy-cloud
```

After this, point the mobile app's env at `NEXT_PUBLIC_SUPABASE_URL` + the anon key and build the APK.

> **Login lockdown:** `seed-cloud` runs `supabase/seeds/cloud-lockdown.sql`, so on the cloud DB only **`admin@ilokal.dev`**, **`owner@ilokal.dev`**, and **`testuser@ilokal.dev`** can sign in (password `ilokal@dev`, restored on every re-seed by `users.sql`). The ~150 sample/follower accounts are disabled. Real accounts created via sign-up afterwards are unaffected. Need a secret password for a real preview? Change it by hand in the dashboard *after* seeding.

> **Safety & idempotency:** every cloud target refuses to run against a `localhost`/`127.0.0.1` URL, and `seed-storage.sh` refuses to upload to a cloud URL with the local dev key. The whole flow is re-runnable — existing rows and storage objects are skipped, nothing duplicates. (Rows seeded with `ON CONFLICT DO NOTHING` are **not** updated on re-run; reset those rows first if you change their seed values.)

---

## 📌 Notes

- Replace `[file-name]` with a descriptive name for the migration.
- Ensure Docker is running before executing any Supabase-related commands.
