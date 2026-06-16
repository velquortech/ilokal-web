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

2. Set up Supabase (ensure Docker is running):

   ```bash
   make setup-supabase
   ```

3. Run the development server:
   ```bash
   make run-dev
   ```

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
