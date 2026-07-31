# Backend contribution rules

- `app-2` is the Express API and PostgreSQL persistence layer for the ALSMA frontend in `app-1`; expose browser-facing behavior through `/api` JSON endpoints only.
- Keep application setup in `src/app.ts`, startup and shutdown in `src/server.ts`, router composition in `src/routes.ts`, and domain behavior within `src/features/<feature>`.
- Validate request input with the existing Zod middleware, keep handlers thin, and use the shared Prisma database client rather than feature-local connections.
- Manage schema changes in `prisma/schema.prisma` with a named Prisma migration; never edit `src/generated/prisma` manually.
- Keep credentials server-side and use the existing managed-storage adapter for persistent uploaded files.
- Preserve `GET /health` as a lightweight process check and `GET /api/health` as database readiness.
- Validate backend changes with `pnpm run format:check`, `pnpm run typecheck`, `pnpm run db:check`, and `pnpm run build` as applicable.
