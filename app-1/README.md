# ALSMA frontend

`app-1` is the ALSMA hotel web application. It delivers the public hotel website, guest account flows, and the staff administration interface.

## Realtime chat

Public pages include a compact chat widget backed by `/api/chat`. Each visitor receives a browser-local conversation id, and messages are exchanged over Server-Sent Events. When a staff member opens a row from **Обращения**, the request detail page contains the conversation transcript and a realtime reply form for that specific request.

The first chat iteration intentionally uses backend process memory. Messages are limited to 100 per conversation and disappear when the backend restarts; this keeps the MVP focused on the realtime interaction before introducing durable conversation storage.

## Галерея проживания

В административной форме проживания превью фотографий отображаются в квадратных контейнерах с кадрированием `object-cover`. Первое фото по-прежнему используется как обложка, а порядок фотографий можно менять стрелками.

## Единые сценарии отдыха

Блок «Каким будет ваш идеальный отдых!» на главной странице и блок «Готовые сценарии отдыха» на странице акций используют одну коллекцию `offers/ready-scenarios`. Редактирование сценариев доступно в административном разделе «Акции» → «Готовые сценарии»; отдельного редактора сценариев в разделе «Главная» нет.

## Медиа из CMS

Backend возвращает URL загруженных файлов относительно `/api`. В CMS сохраняются канонические относительные media URL, а общий `resolveMediaUrl` добавляет настроенный API-хост только при отображении. Нормализация учитывает API base, который уже заканчивается на `/api`, и автоматически исправляет ранее сохранённые preview URL с дублированным `/api/api/media/`. Благодаря относительному хранению один и тот же контент работает в preview и production. Браузер отправляет файл только ALSMA API; backend выполняет единственную авторизованную multipart-загрузку в managed storage и возвращает asset после получения `objectId`. Прямые и подписанные загрузки из браузера не используются.

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

## Акции

В карточках актуальных акций на странице акций и на главной странице описание ограничено четырьмя строками и обрезается многоточием. Кнопка «Подробнее» открывает одинаковое модальное окно с полным описанием, изображением и кнопкой перехода по ссылке, сохранённой для акции в административной панели.

## Номера

В публичных карточках номеров оставлена одна CTA-кнопка «Забронировать», ведущая на страницу `/booking`; остальные кнопки действий убраны. Форма «Оставить заявку» в блоке форматов размещения использует полноформатную модалку с отдельным заголовком, крупными полями и кнопкой отправки.

## Мобильные модалки

Общий компонент `Modal` учитывает реальную высоту мобильного viewport через `dvh`, ограничивает высоту окна и прокручивает содержимое внутри модалки. На время открытой модалки блокируется прокрутка страницы под ней; на узких экранах используются уменьшенные внешние и внутренние отступы.
