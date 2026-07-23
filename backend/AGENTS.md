# Project Backend Agent Instructions

## Role

`backend/` owns the project's Express TypeScript API. Keep browser UI and client-side state in
`frontend/`; communicate with them through HTTP contracts.

## Required Guidance

- Read [available environment variables](docs/AMAZI_ENV_DOCS_GENERATED.md) before reading configuration or using an integration.
- Read `docs/libraries.md` before selecting a backend library or introducing a new infrastructure dependency.
- Read `docs/file-storage.md` before implementing uploads, downloads, or generated persistent files.

## Architecture

- Keep `src/server.ts` limited to process startup and shutdown concerns.
- Configure and compose Express in `src/app.ts`.
- Split routes, services, validation, and persistence by feature as the backend grows.
- Keep route handlers thin and move reusable behavior out of transport code.
- Use TypeScript strict mode and arrow functions only.
- Bind the managed development server to `0.0.0.0` and use the configured project port.

## File placement

- `src/features/<feature>/`: keep each domain feature together. Use `<feature>.routes.ts` for route
  declarations, `<feature>.handlers.ts` for thin HTTP handlers, `<feature>.schemas.ts` for request
  validation, `<feature>.service.ts` for business logic, and `<feature>.repository.ts` for database
  queries. Add only the files the feature needs.
- `src/routes.ts`: compose feature routers only; do not implement endpoints or business logic here.
- `src/lib/config.ts` and `src/lib/logger.ts`: shared environment parsing and logging only.
- `src/lib/database/`: the shared Prisma client, migration startup, and database-wide helpers only.
- `src/lib/http/`: reusable transport concerns such as validation, errors, pagination, and
  middleware.
- `prisma/schema.prisma`: database models; `prisma/migrations/`: the single migration for each
  logical schema change. Never edit `src/generated/prisma/` manually.

## Database

- Use the shared Prisma client factory in `src/lib/database/`; do not create feature-local clients
  or connection pools.
- Define PostgreSQL models in `prisma/schema.prisma` and keep exactly one Prisma migration for each
  logical schema change.
- The baseline migration is applied when the project runtime starts. Never add new models or
  columns to the applied baseline. Create a named feature migration with
  `pnpm exec prisma migrate dev --name <feature>` after changing the schema.
- `prisma generate` and `prisma validate` do not update the database. Before considering any
  database-backed feature complete, apply its migration and exercise an endpoint that reads the
  new table or column.
- If an applied development feature migration must be amended, update that same migration and run
  `pnpm exec prisma migrate reset --force` to rebuild the disposable local database. Do not create
  corrective migration chains for unshipped development work.
- The runtime supplies `DATABASE_URL` to server-side database processes. Never expose it to browser
  code or a `VITE_*` variable, return it through HTTP, or print or attach it to logs.
- Run migrations before accepting HTTP traffic. Keep `GET /health` independent of PostgreSQL and
  use `GET /api/health` for database readiness.

## File storage

- Store persistent user files through `src/lib/storage/managed-storage.ts`; do not store large
  binaries in PostgreSQL, the Git workspace, container filesystems, or base64 fields.
- Keep `AMAZI_STORAGE_PROJECT_TOKEN` server-only. Never expose it to frontend code, logs, responses,
  attachments, or user-configurable environment variables.
- Let browsers upload bytes directly to signed URLs. Project backend endpoints should broker upload
  creation and signed downloads, then persist returned object IDs in domain records.
- Treat preview and production storage as separate environments. Do not copy stored objects into
  clones or templates unless a product requirement explicitly defines a safe copy workflow.

## HTTP

- Keep `GET /health` lightweight and independent of optional integrations.
- Return JSON from API routes.
- Declare endpoints in `<feature>.routes.ts`, validate their inputs with the project's
  `validateRequest` middleware and feature schemas, and delegate transport behavior to thin
  `<feature>.handlers.ts` handlers. Do not implement endpoint logic inline in route declarations.
- Read validated body, params, and query values from `response.locals.input`; do not re-parse raw
  Express request values inside handlers.
- Build paginated query schemas from `paginationQuerySchema`, use `getPaginationRange` for database
  `skip` and `take`, and return lists through `createPaginatedResponse`. Do not invent a different
  pagination envelope for each feature.
- Do not add CORS for the project frontend; the platform exposes the backend through the same
  preview origin under `/api` and Vite forwards that path internally.
- Do not hardcode the public preview host or internal container names.
- The platform owns the backend development process. Do not start a duplicate server from frontend
  code or replace the configured `dev` script with a detached process.

## Dependencies

Use `pnpm` and keep `package.json` and `pnpm-lock.yaml` synchronized.

Never read, print, or commit secrets or local environment files.
