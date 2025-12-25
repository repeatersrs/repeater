# Container names
backend_container := "repeater-backend"
frontend_container := "repeater-web"
db_container := "repeater-db"

# Initialize the project from scratch
init: reset-db dev generate-web-client bootstrap

# Start all services in development mode
dev:
    docker compose up --build -d

# Run database migrations
migrate:
    docker exec {{backend_container}} alembic upgrade head

# Bootstrap the database with seed data
bootstrap:
    docker exec {{backend_container}} python -m src.db.bootstrap

# Reset the database (destructive!)
reset-db:
    docker compose up -d db
    @echo "Waiting for database to be ready..."
    @until docker exec {{db_container}} pg_isready -U user -d postgres > /dev/null 2>&1; do sleep 1; done
    docker exec {{db_container}} psql -U user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='repeater';"
    docker exec {{db_container}} psql -U user -d postgres -c "DROP DATABASE IF EXISTS repeater;"
    docker exec {{db_container}} psql -U user -d postgres -c "CREATE DATABASE repeater;"

# Export OpenAPI spec from backend
export-openapi:
    docker exec {{backend_container}} python scripts/extract-openapi.py
    docker cp {{backend_container}}:/tmp/openapi.yaml docs/openapi.yaml

# Generate TypeScript client from OpenAPI spec
generate-web-client: export-openapi
    docker exec {{frontend_container}} pnpm run openapi-ts

# Run backend tests (pass args like: just test -k test_foo)
test *args:
    docker exec {{backend_container}} uv run pytest -s --tb=short {{args}}

# Format code in backend and frontend
format:
    docker exec {{backend_container}} uvx ruff check --select I --fix
    docker exec {{backend_container}} uvx ruff format
    docker exec {{frontend_container}} pnpm run lint:fix

# Create a new database migration
revision message:
    docker exec {{backend_container}} alembic revision --autogenerate -m "{{message}}"
