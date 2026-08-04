# ALSMA frontend

`app-1` is the ALSMA hotel web application. It delivers the public hotel website, guest account flows, and the staff administration interface.

## Architecture

The application uses TanStack Router, TanStack Query, React Hook Form, and Tailwind CSS.

- `src/routes` contains file-based route declarations; `src/routeTree.gen.ts` is generated from them.
- `src/pages` composes route-level screens.
- `src/components/site`, `src/components/account`, and `src/components/admin` contain product UI by area.
- `src/components/ui` contains shared UI primitives, including the range date picker used by booking.
- `src/lib` contains API clients, query hooks, session helpers, and site data.
- Публичные страницы и админские редакторы безопасно обрабатывают ответы без коллекции `items`: для публичной части используются локальные fallback-данные, а редакторы показывают доступное состояние без падения приложения.
- Админская оболочка проверяет наличие пользователя до чтения его прав. Если сессия истекла или production API вернул неполный ответ авторизации, пользователь перенаправляется на страницу входа вместо падения с ошибкой JavaScript.

Экран бронирования (`src/pages/BookingPage.tsx`) позволяет выбрать диапазон дат в одном календаре, количество взрослых, возраст каждого ребёнка и до двух номеров. Параметры `childAges` и `roomCount` отправляются в `/api/booking/offers` и `/api/booking/reservations`; итоговая стоимость отображается с учётом выбранного количества номеров.

The frontend communicates with `app-2` through relative `/api` requests. During development, Vite forwards that path to the backend target configured through `BACKEND_PROXY_TARGET`. In production, `static-server.mjs` proxies the whole `/api` boundary before the static-file handler, preserving POST bodies so admin login and other mutations reach Express instead of receiving a `405 Method not allowed` response. It also normalizes non-read requests when an upstream ingress has removed the public `/api` prefix. Browser code must not use backend container addresses directly.

`BACKEND_PROXY_TARGET` is a shared project variable and must point to the registered backend application using its internal runtime address (`http://app-{app-2 UUID without hyphens}:{app-2 port}`). The production Docker build stores this value in a private file inside the frontend container, so production proxying does not depend on runtime environment injection and the target is never exposed to browser code. If this variable is changed, publish `app-1` (or use **Update all**) to rebuild the container; changing browser cache cannot update this proxy target.

## Development

Run commands from `app-1`:

```bash
pnpm install
pnpm run dev
```

## Validation

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run build
```

`pnpm run build` performs a TypeScript check before creating the production bundle.
