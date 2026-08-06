# ALSMA backend

`app-2` is the ALSMA Express API. It provides the data and server-side workflows used by the `app-1` public site, guest account, and staff administration interface.

## Вход в личный кабинет

Гостевой вход выполняется только по электронной почте: `POST /api/auth/request-code` принимает email и возвращает код подтверждения для локальной проверки. Вход по номеру телефона отключён на уровне API и интерфейса.

Поле `phone` в таблицах `guest_users` и `guest_login_codes` пока сохраняется для совместимости со старыми данными схемы. Для новых email-only аккаунтов backend хранит техническое значение `email:<адрес>`; оно не является способом входа и не отображается как номер телефона.

## Architecture

The backend uses TypeScript, Express, PostgreSQL, Zod, Pino, Helmet, and managed file storage. Feature routers live in `src/features` and are mounted from `src/routes.ts`.

The browser API is public at the transport layer: every origin receives `Access-Control-Allow-Origin: *`, all preflight requests are accepted, and Helmet permits cross-origin resource embedding. `CORS_ALLOWED_ORIGINS` is no longer read by the application. Endpoint-level authentication and permission checks still protect administrative operations.

## Managed media storage

Authenticated CMS uploads are sent as raw file bodies to `POST /api/media/admin/uploads?fileName=...`. The API validates the media type and 50 MiB size limit, sends an ASCII-safe internal filename, then performs one server-side authenticated multipart `POST` to the managed storage `/uploads` endpoint using the `file` field. The original filename remains in the CMS response. The storage token never reaches browser code, and the API returns an asset only after storage has returned its `objectId`; storage failures are returned as a clear 502 response. Managed assets are read through `/api/media/managed/:objectToken`; the UUID media route remains read-only for files created by the legacy database-backed uploader.

`GET /health` reports process health without requiring the database. `GET /api/health` reports database readiness.

## Realtime chat MVP

The `/api/chat` feature exposes a public guest conversation and conversation-specific manager replies. Messages are delivered immediately over Server-Sent Events (`/api/chat/stream` and `/api/chat/admin/stream`) and are currently kept in process memory for this first iteration, with a limit of 100 messages per conversation. Restarting the API clears this temporary chat history; persistent storage can be added once the conversation workflow is approved.

The public widget is mounted on public site pages. Staff open a row in **Обращения**, then communicate inside that request detail page. Admin SSE authentication uses the existing admin session token as a query parameter because native `EventSource` cannot send custom headers.

## Источник клиентов в админ-панели

Раздел `/api/admin/clients` возвращает поле `source`. Значение `Eptera` устанавливается, если у клиента есть локально сохранённая бронь с `epteraReservationId`; остальные записи помечаются как `Личный кабинет`. Это read-only производное поле: данные бронирования остаются в ALSMA, а секреты Eptera не передаются в браузер.

## Eptera / ElektraWeb booking integration

Configure `EPTERA_API_KEY` and `EPTERA_HOTEL_ID` through the Eptera Booking API integration in project settings. Values remain server-side and must not be added to the frontend or exposed in `VITE_*` variables.

Reservation requests sent to Eptera include the configured numeric `hotel-id`, the guest nationality, the selected offer identifiers and price, room/guest counts, contacts, and the guest list. The backend validates the selected offer again immediately before creation so stale prices cannot be submitted. Eptera errors are kept behind the backend's stable error response.

## Development

```bash
pnpm install
pnpm run dev
```

## Validation

```bash
pnpm run format:check
pnpm run typecheck
pnpm run db:check
pnpm run build
```

## Расширенные данные номеров

Сервис бронирования обогащает предложения данными `hotel-definitions` Eptera: галерея фотографий, площадь, вместимость, количество комнат, варианты кроватей и описание. Поддерживаются как одиночный `room-image-url`, так и массивы изображений из definitions; данные кэшируются на пять минут, остаются на backend и передаются браузеру только как часть ответа `/api/booking/offers`. При отсутствии отдельных полей frontend показывает нейтральные значения.

## Данные тарифов

Ответ `/api/booking/offers` сохраняет дополнительные поля Eptera для тарифа: описание (`rate-description` или `rate-property`) и строковые преимущества (`benefits`). Если эти поля отсутствуют, frontend формирует нейтральные теги из типа питания и условий отмены.
