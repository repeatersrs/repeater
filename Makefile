BACKEND_CONTAINER=repeater-backend
FRONTEND_CONTAINER=repeater-web
DB_CONTAINER=repeater-db
BACKEND_EXEC=docker exec $(BACKEND_CONTAINER)
FRONTEND_EXEC=docker exec $(FRONTEND_CONTAINER)
DB_EXEC=docker exec $(DB_CONTAINER)


.PHONY: init
init: reset-db dev generate-web-client bootstrap


.PHONY: dev
dev:
	docker compose up --build -d


.PHONY: migrate
migrate:
	$(BACKEND_EXEC) alembic upgrade head


.PHONY: bootstrap
bootstrap:
	$(BACKEND_EXEC) python -m src.db.bootstrap


.PHONY: down
down:
	docker compose down


.PHONY: stop
stop:
	docker compose stop


.PHONY: start
start:
	docker compose start


.PHONY: restart
restart:
	docker compose restart


.PHONY: reset-db
reset-db:
	docker compose up -d db
	@echo "Waiting for database to be ready..."
	@until $(DB_EXEC) pg_isready -U user -d postgres > /dev/null 2>&1; do sleep 1; done
	$(DB_EXEC) psql -U user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='repeater';"
	$(DB_EXEC) psql -U user -d postgres -c "DROP DATABASE IF EXISTS repeater;"
	$(DB_EXEC) psql -U user -d postgres -c "CREATE DATABASE repeater;"


.PHONY: export-openapi
export-openapi:
	$(BACKEND_EXEC) python scripts/extract-openapi.py
	docker cp repeater-backend:/tmp/openapi.yaml docs/openapi.yaml


.PHONY: generate-web-client
generate-web-client: export-openapi
	$(FRONTEND_EXEC) pnpm run openapi-ts


.PHONY: test
test:
	$(BACKEND_EXEC) uv run pytest -s --tb=short $(t)


.PHONY: format
format:
	$(BACKEND_EXEC) uvx ruff check --select I --fix
	$(BACKEND_EXEC) uvx ruff format
	$(FRONTEND_EXEC) pnpm run lint:fix


.PHONY: revision
revision:
	$(BACKEND_EXEC) alembic revision --autogenerate -m "$(m)"

