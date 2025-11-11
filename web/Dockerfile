# syntax=docker.io/docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat && \
  corepack enable pnpm

FROM base AS deps
WORKDIR /install
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS development
WORKDIR /app
COPY --from=deps /install/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "run", "dev"]

FROM base AS builder
WORKDIR /app
COPY --from=deps /install/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm run build

FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
