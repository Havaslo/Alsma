# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS development

RUN apk add --no-cache ca-certificates wget \
  && wget -qO /app/russian-trusted-root-ca.crt \
    http://nuc-cdp.digital.gov.ru/cdp/rootca_ssl_rsa2022.crt

ENV HOME=/tmp/amazi-home
ENV NODE_ENV=development
ENV NODE_EXTRA_CA_CERTS=/app/russian-trusted-root-ca.crt

WORKDIR /app

RUN corepack enable

USER 65532:65532

CMD ["sh", "-c", "pnpm install --frozen-lockfile --ignore-scripts --store-dir /tmp/pnpm-store && exec pnpm run dev"]

FROM node:22-alpine AS build

RUN apk add --no-cache ca-certificates wget \
  && wget -qO /tmp/russian-trusted-root-ca.crt \
    http://nuc-cdp.digital.gov.ru/cdp/rootca_ssl_rsa2022.crt
ENV NODE_EXTRA_CA_CERTS=/tmp/russian-trusted-root-ca.crt

WORKDIR /app

COPY . .

RUN cp /tmp/russian-trusted-root-ca.crt /app/russian-trusted-root-ca.crt \
  && rm /tmp/russian-trusted-root-ca.crt

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

RUN apk add --no-cache ca-certificates

ENV NODE_ENV=production
ENV NODE_EXTRA_CA_CERTS=/app/russian-trusted-root-ca.crt

WORKDIR /app

COPY --from=build --chown=65532:65532 /app ./

USER 65532:65532

CMD ["node", "dist/server.js"]
