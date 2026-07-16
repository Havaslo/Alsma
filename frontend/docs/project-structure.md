# Project Structure, Dependencies, and Assets

## File Placement

- `src/app`: application composition, providers, and top-level routing only.
- `src/pages`: route-level screens that compose components.
- `src/components`: page sections and reusable components.
- `src/components/common`: reusable composed sections and application layout components.
- `src/components/form`: reusable form composition components.
- `src/components/ui`: reusable, domain-neutral UI primitives.
- `src/hooks`: reusable application-wide hooks that are not owned by one component.
- `src/lib`: API and query setup, constants, shared types, and generic helpers.
- `src/lib/theme`: theme provider and theme controls.

Split large pages into focused components when they begin to own unrelated sections, data access, and state.
Keep pages, components, providers, hooks, and utilities separated by responsibility.

## Dependencies

- Use `pnpm` for dependency management.
- Add a dependency with `pnpm add <package>` only when the requested functionality needs it.
- Keep `pnpm-lock.yaml` synchronized with `package.json`.
- Prefer an existing scaffold dependency when it adequately covers the task.

## Assets

- Put component-imported files in `src/assets`.
- Reserve `public` for stable root URLs such as favicons, robots files, manifests, and social preview images.
- Do not duplicate assets or keep unused generated uploads.
