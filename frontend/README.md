# ALSMA Frontend

The frontend serves the public ALSMA hotel website, guest account, and staff administration. It
uses Vite, React, TypeScript, React Router, TanStack Query, React Hook Form, and Tailwind CSS.

## Commands

```bash
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run lint
pnpm run build
```

## Product structure

- `src/pages`: route-level composition.
- `src/components/site`: public website sections and lead forms.
- `src/components/admin`: staff workflows and editors.
- `src/components/ui`: product-used interaction primitives.
- `src/components/Form.tsx`: the typed React Hook Form submit boundary.
- `src/lib`: API clients, query hooks, sessions, and domain data.
- `src/AMAZI_ROUTES.ts`: the route registry shared with Amazi preview navigation.

Keep server state in TanStack Query and use local React state only for transient UI interaction.
All submit flows use React Hook Form.

## Data requests

The shared `apiClient` uses `/api`. Standalone tooling and Amazi history previews may override it
with the process-level `VITE_API_BASE_URL`; project custom variables cannot use the `VITE_` prefix.
Components use domain query and mutation hooks rather than calling the client directly.
