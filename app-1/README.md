# ALSMA frontend

`app-1` is the ALSMA hotel web application. It delivers the public hotel website, guest account flows, and the staff administration interface.

## Realtime chat

Public pages include a compact chat widget backed by `/api/chat`. Each visitor receives a browser-local conversation id, and messages are exchanged over Server-Sent Events. When a staff member opens a row from **Обращения**, the request detail page contains the conversation transcript and a realtime reply form for that specific request.

The first chat iteration intentionally uses backend process memory. Messages are limited to 100 per conversation and disappear when the backend restarts; this keeps the MVP focused on the realtime interaction before introducing durable conversation storage.

## Галерея проживания

В административной форме проживания превью фотографий отображаются в квадратных контейнерах с кадрированием `object-cover`. Первое фото по-прежнему используется как обложка, а порядок фотографий можно менять стрелками.

## Architecture

The application uses TanStack Router, TanStack Query, React Hook Form, and Tailwind CSS. Routes are in `src/routes`, pages in `src/pages`, and reusable UI in `src/components`.

The frontend communicates with `app-2` through relative `/api` requests. Browser code must not use backend container addresses directly.

## Development

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
