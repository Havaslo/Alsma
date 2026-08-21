# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS development

ENV HOME=/tmp/project-home
ENV NODE_ENV=development

WORKDIR /app

RUN corepack enable

USER 65532:65532
CMD ["sh", "-c", "pnpm install --ignore-scripts --store-dir /tmp/pnpm-store && exec pnpm run dev"]

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN corepack enable \
  && pnpm install --frozen-lockfile

COPY . .

ARG AMAZI_BUILD_REVISION=local

RUN --mount=type=secret,id=application_environment,required=false \
  set -eu; \
  test -n "$AMAZI_BUILD_REVISION"; \
  if [ -f /run/secrets/application_environment ]; then \
    cp /run/secrets/application_environment .env.production.local; \
  fi; \
  rm -rf dist; \
  pnpm run build; \
  rm -f .env.production.local

FROM ghcr.io/static-web-server/static-web-server:2.41.0-alpine@sha256:58e12f1502be7b68cf492e27582a81634583f3389005e94ce44729cc1464a941 AS production

ENV SERVER_FALLBACK_PAGE=/app/dist/index.html
ENV SERVER_HEALTH=true
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=3000
ENV SERVER_ROOT=/app/dist

COPY --from=build --chown=65532:65532 /app/dist /app/dist

USER 65532:65532
