# Amazi Project

This project contains a Vite React frontend and an Express TypeScript backend in one Git workspace.
The applications keep independent dependencies and lockfiles.

The backend includes managed project file storage for persistent uploads and generated files. See
`backend/docs/file-storage.md` for the direct signed upload, download, and deletion flow.

## Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

The platform manages the development server on port `5173`. Browser API requests use the relative
`/api` base URL. In the project runtime, Vite forwards those requests to the private backend
container. For standalone local development, `BACKEND_PROXY_TARGET` defaults to
`http://localhost:3000`.

## Backend

```bash
cd backend
pnpm install
export DATABASE_URL=postgresql://app:app@localhost:5432/app
pnpm run db:migrate
pnpm run dev
```

The backend listens on port `3000` by default. `GET /health` is the container liveness endpoint;
application routes live under `/api`, starting with `GET /api/health` and `GET /api/hello`.
`GET /api/health` checks PostgreSQL readiness and returns a safe `503` response when the database is
unavailable. The platform supplies `DATABASE_URL`, the managed storage API URL and project token,
starts the database, and does not publish the backend port directly. Standalone development must
export values for `AMAZI_STORAGE_API_URL` and `AMAZI_STORAGE_PROJECT_TOKEN` that point to a compatible
storage service before starting the backend.

The backend uses Prisma ORM with PostgreSQL. Models live in `prisma/schema.prisma`, the tracked
migration history lives in `prisma/migrations/`, and `pnpm run db:migrate` applies pending migrations
locally. The managed runtime waits for PostgreSQL and runs `prisma migrate deploy` before the HTTP
server starts. After changing the schema, generate the Prisma Client and validate the schema from
`backend/`:

```bash
pnpm run db:generate
pnpm run db:check
```

Create the single migration for a logical schema change with `pnpm exec prisma migrate dev --name
<change-name>`. Amend an unshipped migration instead of adding corrective migration files.

The platform generates application-local `AMAZI_ENV_GENERATED.env` files and matching
`docs/AMAZI_ENV_DOCS_GENERATED.md` documentation. Do not edit generated files or commit generated
env values. Configure project variables through the Amazi Environment editor. Custom values are
copied into both applications but remain unavailable to browser code because custom names cannot
use the `VITE_` prefix. For standalone local development, export overrides in the shell as shown
above. `AMAZI_STORAGE_API_URL` and `AMAZI_STORAGE_PROJECT_TOKEN` are platform-managed backend
values; never expose the storage token or `DATABASE_URL` to frontend code.

The platform initializes `frontend/src/AMAZI_THEME_GENERATED.css` with the creator's resolved Amazi
theme. Project style settings always retain light and dark palettes while allowing the preferred
theme to follow the system or stay fixed to light or dark.
