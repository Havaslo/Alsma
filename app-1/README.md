# ALSMA frontend

`app-1` is the ALSMA hotel web application. It delivers the public hotel website, guest account flows, and the staff administration interface.

## Architecture

The application uses React, TypeScript, Vite, TanStack Router, TanStack Query, React Hook Form, and Tailwind CSS.

- `src/routes` contains file-based route declarations; `src/routeTree.gen.ts` is generated from them.
- `src/pages` composes route-level screens.
- `src/components/site`, `src/components/account`, and `src/components/admin` contain product UI by area.
- `src/components/ui` contains shared UI primitives.
- `src/lib` contains API clients, query hooks, session helpers, and site data.

The frontend communicates with `app-2` through relative `/api` requests. During development, Vite forwards that path to the backend target configured through `BACKEND_PROXY_TARGET`; browser code must not use backend container addresses directly.

## Development

Run commands from `app-1`:

```bash
pnpm install
pnpm run dev
```

## Validation

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run build
```

`pnpm run build` performs a TypeScript check before creating the production bundle.
