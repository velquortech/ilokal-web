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
	@echo "Creating .env file with Supabase configurations..." 
	@if [ -s supabase_output.txt ]; then \
		echo "NEXT_PUBLIC_DESTINATION=/auth/sign-in" >> .env; \
		echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env; \
		echo "NEXT_IMAGE_PUBLIC_URL=http://127.0.0.1:54321/storage/**" >> .env; \
		echo "NEXT_PUBLIC_SUPABASE_URL=$$(grep 'API URL' supabase_output.txt | awk -F': ' '{print $$2}' | tr -d '\r')" >> .env; \
		echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$$(grep 'Publishable key' supabase_output.txt | awk -F': ' '{print $$2}' | tr -d '\r')" >> .env; \
		echo "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=$$(grep 'Secret key' supabase_output.txt | awk -F': ' '{print $$2}' | tr -d '\r')" >> .env; \
		echo "NEXT_PUBLIC_SUPABASE_DB_URL=$$(grep 'Database URL' supabase_output.txt | awk -F': ' '{print $$2}' | tr -d '\r')" >> .env; \
		echo "NEXT_PUBLIC_SYNCFUSION_KEY=SYNCFUSION_KEY" >> .env; \
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
	@yarn supabase migration up

migrate-diff:
	@yarn supabase db diff --local > supabase/migrations/$(shell date +%Y%m%d%H%M%S)_schema_changes.sql

migrate-reset:
	@yarn supabase db reset

generate-types:
	yarn supabase gen types typescript --local

.PHONY: all init-log setup-supabase clean migrate-new migrate-up migrate-diff migrate-reset stop-db run-dev
