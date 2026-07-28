# Project Frontend Agent Instructions

## Role

Build the ALSMA browser application by extending its existing Vite React architecture and product components.
Do not introduce a second application architecture.

## Required Guidance

Read the document that owns the area you are about to change before editing files:

- [Styling and themes](docs/styling.md)
- [Components and preferred libraries](docs/components.md)
- [Data requests and forms](docs/data-and-api.md)
- [Routing](docs/routing.md)
- [Project structure, dependencies, and assets](docs/project-structure.md)
- Amazi Environment and Integrations settings when the task reads configuration or uses an integration

Read every applicable document when a task crosses multiple areas.

## Core Boundaries

- Use TypeScript, React, and the configured `@/` imports.
- Use arrow functions only.
- Extend existing components and utilities before adding replacements.
- Build user-visible UI with the product's styled components. Do not produce a final UI with raw
  or unstyled native buttons, inputs, selects, checkboxes, textareas, dialogs, tables, or placeholder
  containers when a matching product component exists.
- Use native controls only inside reusable primitives when required for browser semantics and
  accessibility; page and feature code must consume the styled primitive.
- Use `DateInput` for user-facing date selection. Do not render `input type="date"` or rely on the
  browser's native date-picker UI in pages and features.
- Keep browser requests on the relative `/api` boundary. Amazi supplies app-2 through the
  `BACKEND_PROXY_TARGET` application reference.
- Do not edit platform-generated environment or theme files except through their documented Amazi workflows.
