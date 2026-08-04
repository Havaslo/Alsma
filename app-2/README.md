# ALSMA backend

`app-2` is the ALSMA Express API. It provides the data and server-side workflows used by the `app-1` public site, guest account, and administration interface.

## Architecture

The backend uses TypeScript, Express, PostgreSQL, Zod, Pino, Helmet, and managed file storage.

- `src/app.ts` configures Express middleware and mounts the API.
- `src/server.ts` loads configuration, runs migrations, starts the server, and handles shutdown.
- `src/routes.ts` composes feature routers under `/api`.
- `src/features` contains API features for authentication, administration, leads, site content, media, knowledge base, agent scenarios, voice-agent records, and booking.
- `src/lib` contains configuration, database, HTTP, logging, and storage support.
- `prisma/schema.prisma` and `prisma/migrations` define the PostgreSQL schema and administration history.

The backend does not render the frontend. `app-1` calls its JSON endpoints through the relative `/api` path, with the frontend development proxy configured separately.

`GET /health` reports process health without requiring the database. `GET /api/health` reports database readiness.

## Eptera / ElektraWeb booking integration

The production API endpoint supplied by the provider is `https://bookingapi.eptera.ru/`. The documentation is published at the ElektraWeb domain, but project credentials are sent only to the Eptera endpoint. For this provider's `bookingapi#...` credential, the working flow is:

1. Send `POST /login` to `bookingapi.eptera.ru` with `Authorization: Bearer EPTERA_API_KEY`, `Content-Type: application/json`, and body `{}`.
2. Require a successful response, read the temporary JWT from the response field `jwt`, and verify that `allowed-hotel-ids` contains the configured numeric `EPTERA_HOTEL_ID`.
3. Send the temporary JWT as `Authorization: Bearer <jwt>` to `/hotel/{hotel-id}/price/` and reservation endpoints. The bootstrap API key is never used for these requests.
4. Keep the JWT in process memory, refresh it shortly before its decoded `exp` time, and re-authenticate once after a 401/498. Reads and transient 429/5xx failures use bounded retries.
5. Availability requests use the provider's explicit `adult`, `childage`, `fromdate`, `todate`, `currency`, `nationality`, `onlybestoffer`, `promo-code`, and `min-room-count` query parameters. The client accepts both the documented array response and equivalent `data`, `offers`, `prices`, or `items` wrappers.
6. The booking API accepts `roomCount` from 1 to 2. It is passed to Eptera as `min-room-count` during availability checks and as `room-count` during reservation creation; the stored total is multiplied by the selected room count. `childAges` is passed through for age-based availability and guest records use `baby` for under-one-year ages and `child` for older children.

Configure `EPTERA_API_KEY` and `EPTERA_HOTEL_ID` through the Eptera Booking API integration in project settings. Values must remain server-side and must not be added to the frontend or exposed in `VITE_*` variables. If configuration is absent, booking endpoints return `503 EPTERA_NOT_CONFIGURED`; if login or hotel authorization is rejected, they return `503 EPTERA_AUTH_FAILED`.

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
