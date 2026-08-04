# ALSMA backend

`app-2` is the ALSMA Express API. It provides the data and server-side workflows used by the `app-1` public site, guest account, and staff administration interface.

## Architecture

The backend uses TypeScript, Express, PostgreSQL, Zod, Pino, Helmet, and managed file storage. Feature routers live in `src/features` and are mounted from `src/routes.ts`.

`GET /health` reports process health without requiring the database. `GET /api/health` reports database readiness.

## Realtime chat MVP

The `/api/chat` feature exposes a public guest conversation and conversation-specific manager replies. Messages are delivered immediately over Server-Sent Events (`/api/chat/stream` and `/api/chat/admin/stream`) and are currently kept in process memory for this first iteration, with a limit of 100 messages per conversation. Restarting the API clears this temporary chat history; persistent storage can be added once the conversation workflow is approved.

The public widget is mounted on public site pages. Staff open a row in **Обращения**, then communicate inside that request detail page. Admin SSE authentication uses the existing admin session token as a query parameter because native `EventSource` cannot send custom headers.

## Eptera / ElektraWeb booking integration

Configure `EPTERA_API_KEY` and `EPTERA_HOTEL_ID` through the Eptera Booking API integration in project settings. Values remain server-side and must not be added to the frontend or exposed in `VITE_*` variables.

## Development

```bash
pnpm install
pnpm run dev
```

## Validation

```bash
pnpm run format:check
pnpm run typecheck
pnpm run db:check
pnpm run build
```
