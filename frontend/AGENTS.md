# Project Frontend Agent Instructions

## Role

Build the frontend project by extending the fixed Vite React scaffold and its reusable components.
Do not replace the scaffold or introduce a second application architecture.

## Required Guidance

Read the document that owns the area you are about to change before editing files:

- [Styling and themes](docs/styling.md)
- [Components and preferred libraries](docs/components.md)
- [Data requests and forms](docs/data-and-api.md)
- [Routing](docs/routing.md)
- [Project structure, dependencies, and assets](docs/project-structure.md)

Read every applicable document when a task crosses multiple areas.

## Core Boundaries

- Use TypeScript, React, and the configured `@/` imports.
- Use arrow functions only.
- Extend existing components and utilities before adding replacements.
- Keep frontend requests on the relative `/api` boundary.
- Do not edit platform-generated environment or theme files except through their documented Amazi workflows.
- Run `pnpm typecheck`, `pnpm lint`, and `pnpm build` after relevant frontend changes.
