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
	yarn supabase start --ignore-health-check
	yarn dev
	@echo "running dev with supabase"

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
	@for f in supabase/seeds/users.sql supabase/seeds/subscription_plans.sql supabase/seeds/business_categories.sql supabase/seeds/businesses.sql supabase/seeds/products.sql supabase/seeds/coupons.sql supabase/seeds/ratings.sql supabase/seeds/business_subscriptions.sql supabase/seeds/business_posts.sql supabase/seeds/follows.sql supabase/seeds/bulk_seed.sql supabase/seeds/view_counts.sql; do \
		echo "  seeding $$f..."; \
		docker exec -i supabase_db_ilokal-web psql -U postgres -d postgres < $$f; \
	done
	@echo "DB seed complete."

seed: seed-storage seed-db

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
                   coupons ratings business_subscriptions business_posts follows \
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

.PHONY: all init-log setup-supabase clean migrate-new migrate-up migrate-diff migrate-reset stop-db run-dev test test-run test-ui test-coverage review seed-storage seed-db seed seed-cloud migrate-cloud deploy-cloud
