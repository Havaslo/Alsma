# Project Structure, Dependencies, and Assets

## File Placement

- `src/app`: application composition, providers, and top-level routing only.
- `src/pages`: route-level screens that compose components. `_PREVIEW_PAGE.tsx` is the initialized
  home placeholder; `_SHOWCASE_PAGE.tsx` is the optional component reference gallery.
- `src/components`: reusable composed components, forms, and application layouts.
- `src/components/carousel`: Embla-backed carousel wrappers and reusable carousel variants.
- `src/components/chat`: transport-agnostic chat presentation, composer, and message types.
- `src/components/ui`: reusable, domain-neutral UI primitives.
- `src/hooks`: reusable application-wide hooks that are not owned by one component.
- `src/lib`: API and query setup, constants, shared types, and generic helpers. Infinite server-state hooks belong in `src/lib/query`; browser observers belong in `src/hooks`.
- `src/lib/theme`: theme provider and theme controls.

Split large pages into focused components when they begin to own unrelated sections, data access, and state.
Keep pages, components, providers, hooks, and utilities separated by responsibility. If a file grows
over 300 lines, consider splitting it. If it grows over 500 lines, split it before completing the
task.

## Dependencies

- Use `pnpm` for dependency management.
- Add a dependency with `pnpm add <package>` only when the requested functionality needs it.
- Keep `pnpm-lock.yaml` synchronized with `package.json`.
- Prefer an existing scaffold dependency when it adequately covers the task.

## Assets

- Put component-imported files in `src/assets`.
- Reserve `public` for stable root URLs such as favicons, robots files, manifests, and social preview images.
- Do not duplicate assets or keep unused generated uploads.
- Keep reusable preview artwork imported from `src/assets`; do not embed large data URLs in components.
