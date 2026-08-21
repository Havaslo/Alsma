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

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma

RUN corepack enable \
  && pnpm install --frozen-lockfile

COPY . .

ARG AMAZI_BUILD_REVISION=local

RUN set -eu; \
  test -n "$AMAZI_BUILD_REVISION"; \
  rm -rf dist src/generated/prisma; \
  pnpm exec prisma generate; \
  pnpm run build; \
  pnpm prune --prod --ignore-scripts

FROM node:22-alpine AS production

ENV COREPACK_HOME=/opt/corepack
ENV NODE_ENV=production

WORKDIR /app

RUN mkdir -p "$COREPACK_HOME" \
  && corepack enable \
  && corepack prepare pnpm@11.7.0 --activate \
  && chmod -R a=rX "$COREPACK_HOME"

COPY --from=build --chown=65532:65532 /app /app

USER 65532:65532

CMD ["pnpm", "start"]
