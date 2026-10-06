# AI content factory: generation behavior

## Scope and access

The feature serves the administrator content-factory page at `/admin/content-factory`. Its existing authorization requires `site.access`, `site.manage`, or `*`. Calls run through the backend and the connected Amazi AI Gateway; provider credentials never reach the browser. This is a draft-only test integration: it does not call a social-platform publishing API or send content to a channel. Do not add publishing as part of model generation.

## Models and image context

- Text: `gpt-4.1-mini` via Chat Completions, with the generation task, selected channel IDs, selected reference image bytes as an `image_url` data URI, and the channel-specific copy/image/gallery profiles. It returns three editable draft variants with per-channel adaptations.
- Text refinement: authenticated `POST /api/admin/content-factory/generate/refine` accepts the current text, original task, selected channels, free-form user instruction or one of four editing actions, source-photo metadata, and a size-limited base64 JPEG. It uses the same text model and channel profiles, returns a replacement main text and per-channel adaptations, and does not publish. The frontend updates the selected variant and automatically saves it; if draft persistence fails, the edited content remains in the workspace for a manual save.
- Image: `gpt-image-1.5` via one Gateway `/v1/images/edits` request at `medium` quality. The request includes the current post text, the optional additional image prompt, and one selected media photo as the visual reference. No single channel is sent as a generation target. The selected channels only determine which output crops are prepared after the one master image returns. Crops with identical pixel dimensions share one media asset; each unique crop is stored as PNG in project object storage and registered in `content_factory_media`.
- Image generation is asynchronous: `POST /generate/image` stores a server-side job and returns its ID immediately; `GET /generate/image/:jobId` returns `pending`, `processing`, `completed`, or `failed`. The job stores only the temporary source-photo object ID and generation metadata in PostgreSQL. The temporary source image is deleted after completion or failure. Status reads are scoped to the administrator who created the job. A stale processing job is marked failed after five minutes, allowing the interface to show a retry message rather than wait forever.
- Image-generation reference images are prepared as JPEG in the browser and limited to 6 MiB before Base64 JSON transport. The server validates the Base64 payload and actual JPEG signature before storing it or starting a provider request. Other reference-image actions keep their existing limits.
- The explicit extra image prompt can request changes to the scene, including adding people or props. Without an explicit request, the model preserves the recognizable source setting; it must not present unconfirmed prices, offers, amenities, or services as factual.
- The text refinement photo is also signature-validated as JPEG after strict Base64 validation. The frontend limits the prepared JPEG to 7 MiB so its JSON/Base64 representation fits the existing 12 MiB JSON request limit.
- The image-generation action polls the server-side job until it succeeds or fails, then associates every selected channel with its corresponding crop on the selected variant and saves that updated draft once. Channels with the same output dimensions (currently Telegram/MAX square and VK/Instagram portrait) reuse the same crop. If saving the draft fails, generated images remain in the media library and the UI asks the administrator to save the draft manually.

## Channel profile behavior

`content-factory-guidelines.ts` is the shared backend source of truth returned by `GET /api/content-factory/guidelines` and interpolated into both generation prompts.

| Channel    | Copy style                                                     | Test image ratio and output  | Gallery behavior noted to the model                                                                                              |
| ---------- | -------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| VK         | Clear lead, short paragraphs, checked facts, one natural CTA   | 4:5; 1080×1350; JPEG/PNG     | Multiple post attachments exist; do not promise a universal swipe carousel                                                       |
| Telegram   | Compact, conversational, readable line breaks                  | 1:1; 1200×1200; JPEG/PNG     | Bot API `sendMediaGroup` albums require 2–10 items                                                                               |
| MAX        | Short standalone message, direct and factual                   | 1:1; 1200×1200; JPG/JPEG/PNG | Up to 12 media attachments per message per MAX docs; call it a group of attachments, not an Instagram carousel                   |
| Instagram  | Short caption, strong opening, line breaks, selective hashtags | 4:5; 1080×1350; JPEG         | Carousel: 2–10 media items; match item aspect ratios to the first. The current tool generates one image per call, not a carousel |
| Yandex Zen | Article title, explanatory context, headings                   | 16:9; 1600×900; JPEG/PNG     | Article illustrations; no carousel limit is claimed                                                                              |

All image ratios/dimensions above are test-workflow editorial recommendations and target crop output, not universal technical upload limits, except for the platform API limits specifically called out. The backend crops one landscape master output after generation; therefore central safe composition is requested in the prompt. These profiles do not guarantee text-length compliance with every client or API field.

Primary references used when writing the profile:

- Telegram Bot API: <https://core.telegram.org/bots/api>
- MAX attachments: <https://dev.max.ru/docs-api/use-cases/sending-messages/media>
- MAX image limits: <https://dev.max.ru/docs-api/use-cases/sending-messages/attachment-types>
- Meta's Instagram API workspace: <https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-db99ce99-bf76-475c-8b76-718576c11cae>
- VKCOM API object schema: <https://github.com/VKCOM/vk-api-schema/blob/master/wall/objects.json>

Channel guidance should be verified against platform documentation again before enabling publishing. Keep unverified Dzen/VK pixel sizes as editorial recommendations, not claims about platform constraints.
