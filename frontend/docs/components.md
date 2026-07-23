# Components

Reuse these before adding another component or dependency. Props and non-obvious behavior are
documented next to each exported TypeScript prop type.

Pages and features must use these styled components. Raw native controls belong only inside the
reusable primitives that provide their styling and accessibility behavior.
Use `DateInput` instead of `input type="date"` so date selection stays themed across browsers.

## Prebuilt

- Layout: `PageLayout`, `Shell`, `AuthLayout`.
- Forms: `Form`, `Input`, `DateInput`, `Textarea`, `PasswordInput`, `SearchInput`, `Checkbox`, `RadioGroup`, `Select`, `Toggle`, `Button`.
- Display: `Card`, `FeatureCard`, `StatCard`, `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `Loader`, `Tooltip`.
- Overlays: `Modal`, `FilterTrigger`.
- Data: `Table`, `TableActions`, `Tabs`, `AutoFilter`, `InfiniteScrollObserver`.
- Media: `ImagePreview`, `Calendar`, `MapView`.
- Carousel: `Carousel`, `CardCarousel`.
- Chat: components under `src/components/chat`; see `docs/chat-and-ai.md`.

## Defaults

- Use `lucide-react` for icons.
- Use the included `motion` package for animation. `Modal` already owns its portal and transitions.
- Use the included Embla-backed carousel wrappers instead of importing Embla in features.
- Keep simple tables on `Table`; use `@tanstack/react-table` only for complex data grids.
- Use React Hook Form and Zod for non-trivial forms.
- Use TanStack Query for server state and the included infinite-query helpers for paged feeds.
- Keep Leaflet access inside `MapView`.

## Common Scenarios

| Need                           | Use                                           |
| ------------------------------ | --------------------------------------------- |
| Server reads, caching, polling | TanStack Query                                |
| Forms and schema validation    | React Hook Form + Zod                         |
| Infinite feeds                 | `useInfiniteQuery` + `InfiniteScrollObserver` |
| Date and timezone utilities    | `date-fns`                                    |
| Large virtualized lists        | `@tanstack/react-virtual`                     |
| Drag-and-drop file selection   | `react-dropzone` + managed storage            |
| Charts                         | `recharts`                                    |
| Sortable or draggable UI       | `@dnd-kit`                                    |
| Animation and gestures         | `motion`                                      |
| 3D and WebGL                   | `three` + React Three Fiber                   |
| Complex data grids             | `@tanstack/react-table`                       |
| Carousels                      | Existing `Carousel` or `CardCarousel`         |
| Rich-text editing              | TipTap                                        |
| Command palettes               | `cmdk`                                        |
| Client-side PDF rendering      | `react-pdf`                                   |
| Streaming AI chat              | `docs/chat-and-ai.md` + AI SDK                |

`HomePage` renders `_PREVIEW_PAGE.tsx`. `_SHOWCASE_PAGE.tsx` is an optional reference gallery and is
not part of the live route; remove it when it is no longer useful.
