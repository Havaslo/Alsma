# ALSMA backend

`app-2` is the ALSMA Express API. It provides the data and server-side workflows used by the `app-1` public site, guest account, and administration interface.

## Architecture

The backend uses TypeScript, Express, Prisma, PostgreSQL, Zod, Pino, Helmet, and managed file storage.

- `src/app.ts` configures Express middleware and mounts the API.
- `src/server.ts` loads configuration, runs migrations, starts the server, and handles shutdown.
- `src/routes.ts` composes feature routers under `/api`.
- `src/features` contains API features for authentication, administration, leads, site content, media, knowledge base, agent scenarios, voice-agent records, and booking.
- `src/lib` contains configuration, database, HTTP, logging, and storage support.
- `prisma/schema.prisma` and `prisma/migrations` define the PostgreSQL schema and migrations.

The backend does not render the frontend. `app-1` calls its JSON endpoints through the relative `/api` path, with its development proxy configured separately.

`GET /health` reports process health without requiring the database. `GET /api/health` reports database readiness.

## Eptera booking integration

The booking client keeps `EPTERA_API_KEY` and `EPTERA_HOTEL_ID` server-side. For every backend process it logs in to Eptera through `POST /login` using the API key, caches the returned access token in memory, and sends that token as a Bearer token to the hotel price and reservation endpoints. A 401/498 response invalidates the cached token and triggers one re-login attempt.

Configure both variables in the project Environment settings and make sure the backend application receives the updated environment after publishing. Values must not be added to the frontend or exposed in `VITE_*` variables. If either variable is absent in the running backend, booking endpoints return `503 EPTERA_NOT_CONFIGURED`; if Eptera rejects the login, they return `503 EPTERA_AUTH_FAILED` instead of silently showing an empty room list.

## Development

Run commands from `app-2`:

```bash
pnpm install
pnpm run dev
```

The development server generates the Prisma client before starting and runs pending migrations during application startup.

## Validation

```bash
pnpm run format:check
pnpm run typecheck
pnpm run db:check
pnpm run build
```

Use `pnpm run db:generate` after Prisma schema changes. Create and apply a named migration for every schema change; do not edit generated Prisma client files.
