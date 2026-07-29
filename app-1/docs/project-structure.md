# ALSMA Browser Application Structure

- `src/app`: provider and router assembly.
- `src/routes`: TanStack Router file routes. Compatibility routes currently hand off to the
  retained React Router screens while they are migrated incrementally.
- `src/pages`: route-level screens; pages compose features and do not own reusable controls.
- `src/components/site`: public hotel sections, navigation, cards, and lead forms.
- `src/components/admin`: staff dashboards, editors, and operational workflows.
- `src/components/ui`: primitives currently used by the product.
- `src/components/Form.tsx`: shared typed React Hook Form provider and submit boundary.
- `src/lib/admin`, `auth`, `leads`, and `site`: domain contracts, API calls, and query hooks.
- `src/lib/api` and `query`: transport and server-state infrastructure.
- `src/assets/alsma`: product media and brand assets.
- `src/route-constants.ts`: the only frontend route catalog.

Split a module when it owns unrelated domain behavior or approaches 300 lines. Add a component only
when a product route or feature consumes it; do not retain placeholder files or showcase-only
component families.

Use `pnpm` for dependency management and keep `pnpm-lock.yaml` synchronized. Put imported product
media under `src/assets/alsma` and reserve `public` for stable root URLs.
