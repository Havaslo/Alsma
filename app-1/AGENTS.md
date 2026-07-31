# Frontend contribution rules

- `app-1` is the React/Vite application for the ALSMA public site, guest account, and administration UI.
- Keep route declarations in `src/routes`, page composition in `src/pages`, and reusable UI in `src/components`.
- Use the existing TanStack Router, TanStack Query, React Hook Form, Tailwind, and `@/` import conventions; extend existing components before adding new ones.
- Call the backend only through the relative `/api` boundary and existing API/query modules. Do not implement server or persistence behavior here.
- Do not edit `src/routeTree.gen.ts` manually; it is generated from the route files.
- Validate frontend changes with `pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build` as applicable.
