# Components and Preferred Libraries

## General Rules

- Reuse an existing local component before installing a library or creating another primitive.
- Keep reusable, domain-neutral primitives in `src/components/ui`.
- Keep page sections and reusable product components in `src/components`.
- Wrap third-party UI libraries in focused local components instead of exposing their APIs throughout pages.
- Do not install competing libraries for the same purpose unless the user explicitly requests one.
- Install optional libraries only when the requested feature needs them; do not add them preemptively.
- Use `lucide-react` for interface icons if the user does not specify another icon set.

## Common Scenarios

- If the user asks for some kind of chart, graph, analytics, or data visualization, install `recharts`, if not specified otherwise. Put reusable chart components in `src/components/charts`.
- If the user asks for drag-and-drop, sortable lists, kanban movement, or draggable items, install `@dnd-kit/core` and only the required `@dnd-kit` companion packages, if not specified otherwise. Put reusable drag-and-drop components in `src/components/dnd`.
- If the user asks for motion, animated transitions, layout animation, or gesture-driven animation, install `motion`, if not specified otherwise. Keep animation code next to the component that owns the interaction.
- If the user asks for 3D scenes, WebGL content, product viewers, or interactive 3D models, install `three`, `@react-three/fiber`, and `@react-three/drei`, if not specified otherwise. Put reusable 3D components in `src/components/three`.
- If the user asks for a complex data grid with sorting, filtering, column state, or pagination, install `@tanstack/react-table`, if not specified otherwise. Keep simple tables on the existing `src/components/ui/Table.tsx` primitive and put complex grids in `src/components/data-table`.
- If the user asks for a carousel, slider, or swipeable content gallery, install `embla-carousel-react`, if not specified otherwise. Put reusable carousel components in `src/components/carousel`.
- If the user asks for rich-text or block editing, install the required `@tiptap` packages, if not specified otherwise. Put reusable editor components in `src/components/editor`.

Use the smallest library surface that satisfies the request and preserve the scaffold theme tokens in every wrapper.
