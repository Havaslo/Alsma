# ALSMA Hotel Platform

This workspace powers the ALSMA country hotel website, guest account, lead collection, and staff
administration. It is an Amazi-managed product with independent React and Express applications,
not a scaffold or component showcase.

## Product capabilities

- Public hotel, rooms, spa, entertainment, offers, events, news, and information pages.
- Booking, spa, transfer, and event lead forms.
- Guest passwordless login, profile completion, bookings, and loyalty information.
- Role-based staff administration for leads, bookings, clients, knowledge, AI scenarios, site
  content, users, and roles.
- PostgreSQL persistence, uploaded site media, and managed project storage.

## Architecture

- `frontend/`: Vite, React, React Router, TanStack Query, React Hook Form, and Tailwind CSS.
- `backend/`: Express, Prisma, PostgreSQL, authentication, and domain feature modules.
- `docs/`: product integration and review notes.
- `AMAZI_TEMPLATE.json`: the Amazi runtime compatibility baseline; it does not define product
  ownership or turn the workspace into a template.

## Frontend

```bash
cd frontend
pnpm install
pnpm run dev
```

The platform manages the development server on port `5173`. Browser API requests use `/api`; Vite
forwards them to `BACKEND_PROXY_TARGET`, which defaults to `http://localhost:3000` for standalone
development.

## Backend

```bash
cd backend
pnpm install
export DATABASE_URL=postgresql://app:app@localhost:5432/app
pnpm run db:migrate
pnpm run dev
```

The backend listens on port `3000`. `GET /health` is the container liveness endpoint and
`GET /api/health` checks PostgreSQL readiness. The platform supplies `DATABASE_URL`,
`AMAZI_STORAGE_API_URL`, and `AMAZI_STORAGE_PROJECT_TOKEN`; never expose them to frontend code.

Prisma models live in `backend/prisma/schema.prisma`, with one migration per logical schema change.
After schema changes, run:

```bash
pnpm run db:generate
pnpm run db:check
```

Generated environment documentation lives under each application's `docs/` directory. The platform
also manages `frontend/src/AMAZI_THEME_GENERATED.css`; product components consume its semantic
Tailwind tokens.
