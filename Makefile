LOG_FILE=supabase_setup.log
TIMESTAMP=$(shell date +"%Y-%m-%d %H:%M:%S")

init-log:
	@echo "[$(TIMESTAMP)] Initializing setup process" | tee $(LOG_FILE)
	@if [ ! -f supabase/config.toml ]; then \
		echo "[$(TIMESTAMP)] Error: Supabase not initialized. Run 'yarn supabase init' first." | tee -a $(LOG_FILE); \
		exit 1; \
	fi
	@echo "[$(TIMESTAMP)] Supabase config found, proceeding with setup" | tee -a $(LOG_FILE)

setup-supabase: init-log
	@echo "[$(TIMESTAMP)] Starting Supabase setup..." | tee -a $(LOG_FILE)
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "[$(TIMESTAMP)] Error: Docker is not installed or not running." | tee -a $(LOG_FILE); \
		exit 1; \
	fi
	@echo "[$(TIMESTAMP)] Docker is running, executing 'yarn supabase start'..." | tee -a $(LOG_FILE)
	@rm -f .env
	@if yarn supabase start > supabase_output.txt 2>> $(LOG_FILE); then \
		echo "[$(TIMESTAMP)] Supabase started successfully" | tee -a $(LOG_FILE); \
	else \
		echo "[$(TIMESTAMP)] Error: Failed to start Supabase. Check $(LOG_FILE) for details." | tee -a $(LOG_FILE); \
		exit 1; \
	fi
	@echo "[$(TIMESTAMP)] Creating .env file with Supabase configurations..." | tee -a $(LOG_FILE)
	@if [ -s supabase_output.txt ]; then \
		echo "NEXT_PUBLIC_DESTINATION=/home" >> .env; \
		echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env; \
		echo "NEXT_IMAGE_PUBLIC_URL=http://127.0.0.1:54321/storage/**" >> .env; \
		echo "NEXT_PUBLIC_SUPABASE_URL=$$(grep 'Project URL' supabase_output.txt | grep -Eo 'http://[a-zA-Z0-9.:]+' | head -1)" >> .env; \
		echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$$(grep 'Publishable' supabase_output.txt | grep -Eo 'sb_publishable_[a-zA-Z0-9_-]+' | head -1)" >> .env; \
		echo "SUPABASE_SERVICE_ROLE_KEY=$$(grep 'Secret' supabase_output.txt | grep -Eo 'sb_secret_[a-zA-Z0-9_-]+' | head -1)" >> .env; \
		echo "SUPABASE_DB_URL=$$(grep 'postgresql://' supabase_output.txt | grep -Eo 'postgresql://[a-zA-Z0-9.:@/-]+' | head -1)" >> .env; \
		echo "[$(TIMESTAMP)] .env file created successfully" | tee -a $(LOG_FILE); \
	else \
		echo "[$(TIMESTAMP)] Error: Supabase output is empty. Check Supabase CLI or Docker setup." | tee -a $(LOG_FILE); \
		rm -f supabase_output.txt; \
		exit 1; \
	fi
	@rm -f supabase_output.txt
	@echo "[$(TIMESTAMP)] Temporary output file cleaned up" | tee -a $(LOG_FILE)

run-dev:
	@conflict=$$(docker ps --format '{{.Names}}\t{{.Ports}}' 2>/dev/null | grep ':54322->' | grep -v 'supabase_db_ilokal-web' | cut -f1 | head -1); \
	if [ -n "$$conflict" ]; then \
		project=$${conflict#supabase_db_}; \
		echo "Error: port 54322 is held by another Supabase stack ($$conflict)."; \
		echo "       Stop it first, then re-run 'make run-dev':"; \
		echo "         yarn supabase stop --project-id $$project"; \
		exit 1; \
	fi
	yarn supabase start --ignore-health-check
	@./scripts/slim-supabase.sh
	yarn dev
	@echo "running dev with supabase"

# Run the app against the CLOUD project — no Docker, no local Supabase.
#
# Sources the git-ignored .env.cloud (cloud credentials) into the shell so its
# values override .env's local ones (Next.js precedence: process env > .env.*),
# then starts the dev server. Leaves .env and any running local stack alone.
#
# .env.cloud carries the full app-runtime set; refresh it with:
#   npx vercel env pull --environment=production > .env.cloud
#   (then re-add SUPABASE_DB_URL / SEED_DEV_PASSWORD if they were stripped)
#
# For local dev against the Docker stack, use `make run-dev` instead.
dev-cloud:
	@if [ ! -f .env.cloud ]; then \
		echo "Missing .env.cloud — create it from .env.example and fill in the CLOUD values (or: npx vercel env pull)." >&2; \
		exit 1; \
	fi
	@set -a; . ./.env.cloud; set +a; \
	case "$$NEXT_PUBLIC_SUPABASE_URL" in \
		*127.0.0.1*|*localhost*) echo "Refusing: NEXT_PUBLIC_SUPABASE_URL ($$NEXT_PUBLIC_SUPABASE_URL) looks local. Use \`make run-dev\` for the local stack." >&2; exit 1;; \
	esac; \
	yarn dev

# Stop the dev-only Supabase services (analytics, studio, pg_meta, inbucket,
# vector) and pin memory caps on the app-facing ones — the laptop-friendly
# state that `supabase start` alone doesn't give you. `run-dev` calls this
# automatically; run it manually after a bare `yarn supabase start`.
slim-supabase:
	@./scripts/slim-supabase.sh

run-start:
	yarn supabase start --ignore-health-check
	yarn start
	@echo "Running prod with supabase"

start-app:
	yarn start
	@echo "Starting the app"

build-app:
	yarn lint
	yarn build
	@echo "Finish checking linter and building"

stop-db:
	@yarn supabase stop
	@echo "stopping supabase db"

clean:
	@echo "[$(TIMESTAMP)] Stopping Supabase and cleaning up..." | tee -a $(LOG_FILE)
	@if yarn supabase stop >> $(LOG_FILE) 2>&1; then \
		echo "[$(TIMESTAMP)] Supabase stopped successfully" | tee -a $(LOG_FILE); \
	else \
		echo "[$(TIMESTAMP)] Warning: Failed to stop Supabase. Check $(LOG_FILE) for details." | tee -a $(LOG_FILE); \
	fi
	@rm -f .env
	@echo "[$(TIMESTAMP)] .env file removed" | tee -a $(LOG_FILE)

# Taxonomy backlog: which section names shops actually type, ranked by how many
# DISTINCT businesses use them (.claude/CATALOGUES.md phase 6). Read-only.
# Defaults to the local DB; pass SUPABASE_DB_URL to point it at cloud.
report-backlog:
	@psql "$${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}" \
		-f supabase/reports/section_name_backlog.sql

migrate-new:
	@yarn supabase migration new $(name)

migrate-up:
	@yarn supabase migration up --local --include-all

migrate-diff:
	@yarn supabase db diff --local > supabase/migrations/$(shell date +%Y%m%d%H%M%S)_schema_changes.sql

migrate-reset:
	@yarn supabase db reset

seed-storage:
	@bash supabase/seeds/seed-storage.sh

seed-db:
	@for f in supabase/seeds/users.sql supabase/seeds/subscription_plans.sql supabase/seeds/business_categories.sql supabase/seeds/businesses.sql supabase/seeds/freshness_tiers.sql supabase/seeds/products.sql supabase/seeds/bida_of_the_day.sql supabase/seeds/coupons.sql supabase/seeds/ratings.sql supabase/seeds/bida_analytics.sql supabase/seeds/business_subscriptions.sql supabase/seeds/business_posts.sql supabase/seeds/events.sql supabase/seeds/events_enable.sql supabase/seeds/follows.sql supabase/seeds/bulk_seed.sql supabase/seeds/view_counts.sql supabase/seeds/real_world_gaps.sql; do \
		echo "  seeding $$f..."; \
		docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres < $$f; \
	done
	@echo "DB seed complete."

# Seeding strategy, run order, and the no-shared-photos / gaps contracts are
# documented in supabase/seeds/README.md.
seed: seed-storage seed-db

# ── Live snapshot for local testing ───────────────────────────────────────────
# One-shot LIVE→local pull: resets the LOCAL stack, restores live data, syncs
# live storage FILES into local storage (rows stay verbatim — the dev CSP is
# widened with the cloud origin so absolute URLs render). Every LIVE access is
# read-only; all writes are local.
# Live creds resolve from SUPABASE_DB_URL (inline, wins) → SUPABASE_LIVE_DB_URL
# (.env) → SUPABASE_DB_URL in .env.cloud (recommended). Refuses localhost.
# See .claude/docs/live-db-snapshot.md for details and limitations.
pull-live:
	@bash supabase/scripts/pull-live.sh

# Regression check for pull-live.sh: runs it against a SCRATCH stack (own
# project_id + offset ports + own storage key) and asserts the verification
# block passed. The dev stack is never touched. Requires live creds in
# .env.cloud — skips (exit 0) without them, so CI stays green when the repo has
# no live credentials.
pull-live-check:
	@bash supabase/scripts/check-pull-live.sh

# ── Cloud deploy (APK preview build) ──────────────────────────────────────────
# Full flow: `make deploy-cloud` = migrate-cloud (schema + buckets) then seed-cloud
# (data + login lockdown + storage). Or run either step on its own.
#
# Required env for ALL cloud targets (point at the CLOUD project, NOT local):
#   SUPABASE_DB_URL              postgres connection string (must be percent-encoded)
#   NEXT_PUBLIC_SUPABASE_URL     https://<ref>.supabase.co        (seed-cloud only)
#   SUPABASE_SERVICE_ROLE_KEY    service-role key (storage upload) (seed-cloud only)
#
# The 3 dev accounts (admin@/owner@/testuser@ilokal.dev) always keep the in-git
# `ilokal@dev` password across re-seeds (set by users.sql). To use a secret password
# for a real preview, change it by hand in the dashboard AFTER seeding.

deploy-cloud: migrate-cloud seed-cloud

# Push local migrations (creates tables + storage buckets) to the cloud DB.
# --include-all applies every migration missing from the remote history table.
migrate-cloud:
	@if [ -z "$$SUPABASE_DB_URL" ]; then \
		echo "Set SUPABASE_DB_URL to the CLOUD project's connection string first." >&2; exit 1; \
	fi
	@case "$$SUPABASE_DB_URL" in \
		*127.0.0.1*|*localhost*) echo "Refusing: SUPABASE_DB_URL looks local. Use \`make migrate-up\` for local." >&2; exit 1;; \
	esac
	@echo "Pushing migrations to CLOUD database..."
	@yarn supabase db push --db-url "$$SUPABASE_DB_URL" --include-all --yes

# Seed a CLOUD project: runs every seed file over the direct Postgres connection,
# then cloud-lockdown.sql (only the 3 sanctioned dev accounts can log in), then
# uploads storage objects to the cloud buckets. Run `make migrate-cloud` first.
# Re-runnable: seeds use ON CONFLICT and the lockdown is idempotent.
CLOUD_SEED_FILES = users subscription_plans business_categories businesses products \
                   coupons ratings business_subscriptions business_posts events follows \
                   bulk_seed view_counts

seed-cloud:
	@if [ -z "$$SUPABASE_DB_URL" ] || [ -z "$$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$$SUPABASE_SERVICE_ROLE_KEY" ]; then \
		echo "Set SUPABASE_DB_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the CLOUD project first." >&2; \
		exit 1; \
	fi
	@case "$$NEXT_PUBLIC_SUPABASE_URL" in \
		*127.0.0.1*|*localhost*) echo "Refusing: NEXT_PUBLIC_SUPABASE_URL ($$NEXT_PUBLIC_SUPABASE_URL) looks local. Use \`make seed\` for local." >&2; exit 1;; \
	esac
	@echo "Seeding CLOUD project at $$NEXT_PUBLIC_SUPABASE_URL ..."
	@for f in $(CLOUD_SEED_FILES); do \
		echo "  seeding $$f.sql..."; \
		psql "$$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/seeds/$$f.sql || exit 1; \
	done
	@echo "  applying login lockdown (only admin@/owner@/testuser@ilokal.dev can sign in)..."
	@psql "$$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/seeds/cloud-lockdown.sql || exit 1
	@echo "  uploading storage objects to cloud buckets..."
	@bash supabase/seeds/seed-storage.sh
	@echo "Cloud seed complete."

generate-types:
	# Delegate to the db:types script so the `>` redirect lives *inside* the
	# yarn-run shell and captures only supabase's output — running
	# `yarn supabase ... > file` here would also capture yarn's banner
	# (`yarn run vX`, `$ ...`, `Done in`) and corrupt the generated file.
	yarn db:types

test:
	yarn test

test-run:
	yarn test:run

test-ui:
	yarn test:ui

test-coverage:
	yarn test:coverage

review:
	yarn lint --fix
	yarn build
	yarn test:run
	@echo "Review complete: lint, build, and tests passed"

.PHONY: all init-log setup-supabase clean report-backlog migrate-new migrate-up migrate-diff migrate-reset stop-db run-dev dev-cloud slim-supabase run-start start-app build-app test test-run test-ui test-coverage review seed-storage seed-db seed pull-live pull-live-check seed-cloud migrate-cloud deploy-cloud
