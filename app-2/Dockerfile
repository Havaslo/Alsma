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

COPY . .

RUN --mount=type=secret,id=application_environment,required=false \
  set -eu; \
  corepack enable; \
  pnpm install --frozen-lockfile; \
  if [ -f /run/secrets/application_environment ]; then \
    cp /run/secrets/application_environment .env.production.local; \
  fi; \
  pnpm run build; \
  rm -f .env.production.local; \
  pnpm prune --prod

FROM node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build --chown=65532:65532 /app ./

USER 65532:65532

CMD ["node", "dist/server.js"]
