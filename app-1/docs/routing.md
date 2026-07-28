# Routing

- TanStack Router owns the application entrypoint and generated route tree.
- Treat `src/AMAZI_ROUTES.ts` as the retained source of truth for existing React Router paths while
  those screens are migrated incrementally.
- Keep `AMAZI_ROUTES` as the existing flat `export const AMAZI_ROUTES = { ... } as const` object.
- Define every user-facing React Router path in `AMAZI_ROUTES`, then import and reuse that entry in route declarations, links, redirects, and navigation calls.
- Use only plain static string values. Do not add spreads, computed values, or interpolated template literals.
- Do not hardcode application route paths in components or declare them in another file.
- Keep wildcard and other non-navigable route patterns as separate named constants in `src/AMAZI_ROUTES.ts`.
- `AMAZI_ROUTES` must contain only paths that the Amazi preview can offer for navigation.
- Keep the TanStack Router Vite plugin before the React plugin so `src/routeTree.gen.ts` remains
  generated from `src/routes`.
- Use React Router's `generatePath` with an imported `AMAZI_ROUTES` entry when constructing a dynamic URL.
- Do not put backend `/api` endpoint paths in `AMAZI_ROUTES`.
- Keep the current wildcard redirect to the public home route unless the product adds a dedicated
  not-found experience.
