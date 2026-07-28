# Project Agent Instructions

## Structure

This project contains two independent applications in one Git workspace:

- `app-1/` owns the Vite React browser application and its TanStack Router entrypoint.
- `app-2/` owns the Express TypeScript HTTP API.

Read the nearest `AGENTS.md` before changing either application. Keep changes scoped to the
application that owns the behavior, and update both applications together when a feature crosses
the HTTP boundary.

## Package Ownership

Each application owns its package manifest, lockfile, dependencies, and build configuration. Do not
create a root package manifest or couple the applications through undeclared filesystem imports.
Run package commands from inside the application that owns them.

## Template Version

`AMAZI_TEMPLATE.json` records the version of the complete app-1 and app-2 scaffold copied into
this workspace. Treat it as platform-owned provenance metadata: do not modify it during normal
project work unless the task explicitly upgrades the scaffold.

Platform scaffold maintainers must bump `templateVersion` once for each logical scaffold release.
Use SemVer with a patch bump for narrow fixes, a minor bump for new capabilities or structural
changes, and a major bump for intentionally incompatible scaffold changes. The template version is
independent from the root Amazi workspace version and the package versions in `app-1/` and
`app-2/`.

## Tests

Do not create test files, add test runners or testing dependencies, or add test commands unless the
user explicitly asks for tests. When tests are explicitly requested, keep them focused on the
requested behavior and colocate them with the code they cover.

## File Size and Composition

- Split files by responsibility: components, hooks, types, utilities, constants, services, and feature modules should not be mixed without a clear ownership reason.
- If a file grows over 300 lines, consider splitting it into smaller focused files.
- If a file grows over 500 lines, split it into smaller focused files before completing the task.

## Environment Variables

The platform writes runtime values to the owning application's `AMAZI_ENV_GENERATED.env` and
documents available keys in `docs/AMAZI_ENV_DOCS_GENERATED.md`. Both files are platform-owned
generated artifacts: do not edit them. `AMAZI_ENV_GENERATED.env` is ignored and must never be
committed. Do not create `.env`, `.env.local`, `.env.example`, or another environment-variable
manifest.

Use only variables documented in the applicable application's
`docs/AMAZI_ENV_DOCS_GENERATED.md`. If a task needs a missing variable, report that requirement for
configuration through the Amazi Environment editor instead of editing generated files. Custom
variables are copied to both applications, cannot use the `VITE_` prefix, and cannot replace
platform-managed fixed variables. Never access custom values from browser code.

## Integrations

`docs/AMAZI_INTEGRATIONS.md` lists the integrations connected to this project and links to their
platform-generated `docs/integrations/{NAME}-{ID}.md` agent instructions. Read that index before
implementing or changing integration-dependent behavior. The index and linked integration
instruction files are platform-owned generated artifacts; do not edit them directly.

## Review

`docs/AMAZI_REVIEW.md` lists the review instructions for the applications in this workspace. Before
finishing code work, read that index and follow every linked file that applies to an application you
changed. Add future project-specific review rules as linked files under `docs/review/` instead of
expanding this file with project-specific checks.

## HTTP Boundary

Browser requests to app-2 use the relative `/api` base URL. Keep requests in app-1's shared API
client and implement their server behavior in `app-2/`. Amazi supplies the app-2 internal address
through `BACKEND_PROXY_TARGET`; do not hardcode container names, ports, or deployment hostnames.

## Database Boundary

PostgreSQL application code belongs exclusively to `app-2/`. The retained legacy database remains
operator-managed until it is migrated to an explicit application-owned database service. The runtime supplies
`DATABASE_URL` to server-side database processes; never expose it through a `VITE_*` variable or
send it to the browser. Keep the Prisma schema, generated migration history, and database commands
in app-2 and run them from that directory.

## Git and Generated Files

The platform commits and restores the whole project workspace as one Git history. Never create a
nested Git repository in either application. Do not commit secrets, generated dependency folders,
build output, generated Prisma Client files, or local environment files.
