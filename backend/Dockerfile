# https://github.com/astral-sh/uv-docker-example/blob/main/Dockerfile
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

# Install the project's dependencies using the lockfile and settings
COPY uv.lock pyproject.toml ./
RUN uv sync --locked --no-install-project --no-dev

COPY . /app
RUN chmod +x scripts/entrypoint.sh
RUN uv sync --locked --no-dev

ENV PATH="/app/.venv/bin:$PATH"

FROM base AS development

EXPOSE 8000
CMD ["fastapi", "dev", "--host", "0.0.0.0", "src/main.py"]

FROM base AS production

RUN apt-get update && \
    apt-get install -y curl postgresql-client && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
