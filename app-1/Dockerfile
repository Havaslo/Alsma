# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS development

ENV HOME=/tmp/amazi-home
ENV NODE_ENV=development

WORKDIR /app

RUN corepack enable

USER 65532:65532

CMD ["sh", "-c", "pnpm install --frozen-lockfile --ignore-scripts --store-dir /tmp/pnpm-store && exec pnpm run dev"]

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable \
  && pnpm install --frozen-lockfile

COPY . .

RUN --mount=type=secret,id=application_environment,required=false \
  set -eu; \
  : > .backend-proxy-target; \
  if [ -f /run/secrets/application_environment ]; then \
    cp /run/secrets/application_environment .env.production.local; \
  fi; \
  if [ -f .env.production.local ]; then \
    backend_target="$(sed -n 's/^BACKEND_PROXY_TARGET=//p' .env.production.local | head -n 1)"; \
    backend_target="${backend_target#\"}"; \
    backend_target="${backend_target%\"}"; \
    if [ -n "$backend_target" ]; then \
      printf '%s' "$backend_target" > .backend-proxy-target; \
    fi; \
  fi; \
  pnpm run build; \
  rm -f .env.production.local

FROM node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build --chown=65532:65532 /app/dist ./dist
COPY --from=build --chown=65532:65532 /app/.backend-proxy-target ./backend-proxy-target
COPY --chown=65532:65532 production-server.mjs ./server.mjs

USER 65532:65532

CMD ["node", "server.mjs"]
