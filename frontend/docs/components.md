# Product Components

The component tree contains only UI used by ALSMA product flows.

## Ownership

- `components/site`: public navigation, hero media, editorial sections, room discovery, booking, and
  lead capture.
- `components/admin`: bookings, clients, knowledge, AI scenarios, settings, site content, and
  integration readiness.
- `components/ui`: focused product-used primitives for buttons, modal dialogs, date and dropdown
  selection, and loading feedback.
- `components/Form.tsx`: generic React Hook Form provider used by every submit flow.

## Conventions

- Prefer a current product primitive before adding a new component or dependency.
- Use Lucide icons, semantic theme tokens, and Tailwind utilities.
- Keep native form controls registered with React Hook Form; use `Controller` for controlled product
  components.
- Keep API and mutation logic in domain hooks under `src/lib`.
- Add a component only when a real route or feature consumes it. Do not keep placeholders,
  showcase pages, or disconnected component families.
