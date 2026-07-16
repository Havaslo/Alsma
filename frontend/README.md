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
- Axios and TanStack Query with basic query, mutation, and paginated-list helpers
- React Hook Form, Zod, and resolvers for forms and validation
- Sonner for notifications and Lucide for icons
- Tailwind CSS with platform-managed color and font variables in `src/AMAZI_THEME_GENERATED.css`
- Platform-selected initial light or dark mode, with optional visitor switching when both themes
  are enabled
- Unstyled semantic form, modal, dropdown, alert, and data-table components in `src/components/ui`

## Data requests

The shared `apiClient` uses `/api` by default and can be overridden with `VITE_API_BASE_URL`. During
development, Vite proxies `/api` without rewriting the path. `BACKEND_PROXY_TARGET` defaults to
`http://localhost:3000`; the platform sets it to the private backend service. Use the client from
`src/lib/api/api-client.ts`. The `useApiQuery` and `useApiMutation` hooks unwrap Axios responses and
return the standard TanStack Query result. Both hooks show request errors by default and accept
`errorMessage`, `successMessage`, `onSuccess`, `onError`, and `onSettled` options for local request
behavior. Use `getPaginated` from `src/lib/api/pagination.ts` for list endpoints that return the
shared `items` and `pagination` envelope.
