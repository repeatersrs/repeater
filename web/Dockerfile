FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat && \
  corepack enable pnpm

FROM base AS deps
WORKDIR /install
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS development
WORKDIR /app
COPY --from=deps /install/node_modules ./node_modules
COPY web/ .
COPY docs/ ./docs
EXPOSE 3000
CMD ["pnpm", "run", "dev"]

FROM base AS builder
WORKDIR /app
COPY --from=deps /install/node_modules ./node_modules
COPY web/ .
COPY docs/ ./docs
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm run openapi-ts && pnpm run build

FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/dist .
COPY web/nginx.conf /etc/nginx/templates/default.conf.template
ENV PORT=80
EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
