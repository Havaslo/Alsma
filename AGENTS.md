# Project Agent Instructions

## Structure

This project contains two independent applications in one Git workspace:

- `frontend/` owns the Vite React browser application.
- `backend/` owns the Express TypeScript HTTP API.

Read the nearest `AGENTS.md` before changing either application. Keep changes scoped to the
application that owns the behavior, and update both applications together when a feature crosses
the HTTP boundary.

## Commands

Run package commands from inside the relevant application directory so Corepack reads that
application's `packageManager` declaration:

```text
(cd frontend && pnpm run typecheck)
(cd frontend && pnpm run build)
(cd backend && pnpm run typecheck)
(cd backend && pnpm run build)
```

Each application owns its package manifest, lockfile, dependencies, and build configuration. Do not
create a root package manifest or couple the applications through undeclared filesystem imports.

## Template Version

`AMAZI_TEMPLATE.json` records the version of the complete frontend and backend scaffold copied into
this workspace. Treat it as platform-owned provenance metadata: do not modify it during normal
project work unless the task explicitly upgrades the scaffold.

Platform scaffold maintainers must bump `templateVersion` once for each logical scaffold release.
Use SemVer with a patch bump for narrow fixes, a minor bump for new capabilities or structural
changes, and a major bump for intentionally incompatible scaffold changes. The template version is
independent from the root Amazi workspace version and the package versions in `frontend/` and
`backend/`.

## Tests

Do not create test files, add test runners or testing dependencies, or add test commands unless the
user explicitly asks for tests. When tests are explicitly requested, keep them focused on the
requested behavior and colocate them with the code they cover.

## Environment Variables

The platform writes runtime values to the owning application's `AMAZI_ENV_GENERATED.env` and
documents available keys in `AMAZI_ENV_DOCS_GENERATED.md`. Both files are platform-owned generated
artifacts: do not edit them. `AMAZI_ENV_GENERATED.env` is ignored and must never be committed. Do not
create `.env`, `.env.local`, `.env.example`, or another environment-variable manifest.

Use only variables documented in `AMAZI_ENV_DOCS_GENERATED.md`. If a task needs a missing variable,
report that requirement for configuration through the Amazi Environment editor instead of editing
generated files. Backend variables are server-only. Frontend variables without `VITE_` are secret
build values; use the `VITE_` prefix only when a value is intentionally safe to expose in browser
code. Platform-managed fixed variables cannot be replaced by project variables.

## HTTP Boundary

Browser requests to the project backend use the relative `/api` base URL. Keep frontend requests in
the shared frontend API client and implement their server behavior in `backend/`. Do not hardcode
container names, internal ports, or deployment hostnames in project code.

## Database Boundary

PostgreSQL application code belongs exclusively to `backend/`. The runtime supplies
`DATABASE_URL` to server-side database processes; never expose it through a `VITE_*` variable or
send it to the browser. Keep the Prisma schema, generated migration history, and database commands
in the backend application and run them from that directory.

## Git and Generated Files

The platform commits and restores the whole project workspace as one Git history. Never create a
nested Git repository in either application. Do not commit secrets, generated dependency folders,
build output, generated Prisma Client files, or local environment files.
