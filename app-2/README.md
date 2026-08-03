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

## Eptera / ElektraWeb booking integration

The production API endpoint supplied by the provider is `https://bookingapi.eptera.ru/`. The documentation is published at the ElektraWeb domain. For this provider's `bookingapi#...` credential, the working flow is:

1. Send `POST /login` to `bookingapi.eptera.ru` with `Authorization: Bearer EPTERA_API_KEY` and an empty JSON body.
2. Read the JWT from the response field `jwt`.
3. Send the returned JWT as `Authorization: Bearer <jwt>` to `/hotel/{hotel-id}/price/` and reservation endpoints.

The client keeps the API key and hotel ID server-side, caches the JWT for the lifetime of the backend process, and re-authenticates once after a 401/498 response. Configure `EPTERA_API_KEY` and `EPTERA_HOTEL_ID` in project Environment settings. Values must not be added to the frontend or exposed in `VITE_*` variables. If either variable is absent in the running backend, booking endpoints return `503 EPTERA_NOT_CONFIGURED`; if login is rejected, they return `503 EPTERA_AUTH_FAILED`.

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
