# Routing

- Treat `src/AMAZI_ROUTES.ts` as the single source of truth for frontend application paths.
- Keep `AMAZI_ROUTES` as the existing flat `export const AMAZI_ROUTES = { ... } as const` object.
- Define every user-facing React Router path in `AMAZI_ROUTES`, then import and reuse that entry in route declarations, links, redirects, and navigation calls.
- Use only plain static string values. Do not add spreads, computed values, or interpolated template literals.
- Do not hardcode application route paths in components or declare them in another file.
- Keep wildcard and other non-navigable route patterns as separate named constants in `src/AMAZI_ROUTES.ts`.
- `AMAZI_ROUTES` must contain only paths that the Amazi preview can offer for navigation.
- Preserve the `initializePreviewRouteSync()` call in `src/main.tsx`; it synchronizes navigation in both directions so the Amazi preview toolbar can navigate the mounted SPA and reflect in-app route changes without exposing the preview origin.
- Use React Router's `generatePath` with an imported `AMAZI_ROUTES` entry when constructing a dynamic URL.
- Do not put backend `/api` endpoint paths in `AMAZI_ROUTES`.
- Keep the current wildcard redirect to the public home route unless the product adds a dedicated
  not-found experience.
