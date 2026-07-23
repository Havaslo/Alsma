# Project Frontend

This directory contains the fixed Amazi project frontend: Vite, React, TypeScript, and Tailwind CSS.

## Commands

```bash
pnpm install
pnpm run dev
```

Use `pnpm run typecheck` and `pnpm run build` before considering a change complete. Add project
dependencies with `pnpm add <package>`. Use `pnpm run format` and `pnpm run lint` for the included
Prettier and ESLint setup.

## Included foundation

- React Router with the shared `src/AMAZI_ROUTES.ts` registry used by client-side and Amazi preview
  navigation
- Axios and TanStack Query with query, mutation, paginated-list, and infinite-list helpers
- React Hook Form, Zod, and resolvers for forms and validation
- Sonner for notifications and Lucide for icons
- Tailwind CSS with platform-managed color and font variables in `src/AMAZI_THEME_GENERATED.css`
- Platform-selected initial light or dark preference, with both generated palettes retained and an
  optional system preference for visitor switching
- Semantic form, modal, custom select, feedback, and table primitives in `src/components/ui`, with
  theme-aware baseline styling where the interaction requires it

## Data requests

The shared `apiClient` uses `/api` by default. Standalone tooling and Amazi history previews may
override it with a process-level `VITE_API_BASE_URL`; project custom variables cannot use the
`VITE_` prefix. During development, Vite proxies `/api` without rewriting the path.
`BACKEND_PROXY_TARGET` defaults to `http://localhost:3000`; the platform sets it to the private
backend service. Use the client from `src/lib/api/api-client.ts`. The `useApiQuery` and
`useApiMutation` hooks unwrap Axios responses and return the standard TanStack Query result. Both
hooks show request errors by default and accept `errorMessage`, `successMessage`, `onSuccess`,
`onError`, and `onSettled` options for local request behavior. Use `getPaginated` from
`src/lib/api/pagination.ts` for list endpoints that return the shared `items` and `pagination`
envelope. For continuous lists, combine `useInfiniteQuery` from `src/lib/query` with
`InfiniteScrollObserver`; see `docs/data-and-api.md` for the complete pattern.
