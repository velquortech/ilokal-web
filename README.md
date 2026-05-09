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

## 🧪 Testing with Vitest

- Run tests in watch mode (development):

  ```bash
  make test
  ```

- Run all tests once (CI mode):

  ```bash
  make test-run
  ```

- Open interactive test UI dashboard:

  ```bash
  make test-ui
  ```

- Generate coverage report:
  ```bash
  make test-coverage
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

## 📌 Notes

- Replace `[file-name]` with a descriptive name for the migration.
- Ensure Docker is running before executing any Supabase-related commands.

---
