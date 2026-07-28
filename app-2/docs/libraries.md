# Backend Libraries and Common Scenarios

## General Rules

- Prefer the included Express, Zod, Prisma, Pino, and native Node.js capabilities before adding a dependency.
- Add a library only when the requested feature needs it. Install the smallest package surface that satisfies the requirement.
- Keep provider SDKs, credentials, database access, and privileged integrations on the backend.
- Wrap third-party clients in a feature service or a focused `src/lib` adapter instead of importing them throughout handlers.
- Do not introduce Redis, a queue worker, a separate process, or another infrastructure service unless the feature explicitly requires it and Amazi supplies its configuration.
- Validate untrusted input with Zod at the HTTP boundary and keep route handlers thin.

## Included Foundation

- HTTP server and routing: Express.
- Request and configuration validation: Zod.
- PostgreSQL access and migrations: Prisma with the shared client in `src/lib/database`.
- Structured application and HTTP logging: Pino and `pino-http`.
- Security headers: Helmet.
- Persistent uploads and downloads: the Amazi managed-storage adapter documented in `docs/file-storage.md`.
- Pagination: `paginationQuerySchema`, `getPaginationRange`, and `createPaginatedResponse` in `src/lib/http/pagination.ts`.

## Common Scenarios

- If the user asks for ordinary outbound HTTP requests, use the built-in `fetch` API. Install a provider SDK when it owns authentication, signing, retries, webhooks, or typed contracts that should not be recreated locally.
- If the user asks for background jobs, durable retries, delayed work, or distributed scheduling, install `bullmq`, if not specified otherwise, and request a managed Redis connection through Amazi. Keep job producers and workers in separate focused modules.
- If the user asks for simple in-process scheduled work that may be skipped during downtime, install `node-cron`, if not specified otherwise. Use a durable queue instead when every execution matters or multiple instances may run.
- If the user asks for server-to-browser progress updates or a one-way event stream, use Server-Sent Events when it satisfies the interaction. Install `socket.io` for bidirectional realtime rooms, acknowledgements, or reconnect-aware events, if not specified otherwise.
- If the user asks for transactional email through a named provider, use that provider's official SDK. Install `nodemailer` for SMTP transport, if not specified otherwise, and keep templates separate from transport code.
- If the user asks for image resizing, format conversion, thumbnails, or metadata extraction, install `sharp`, if not specified otherwise. Process transient bytes outside PostgreSQL and persist final files through managed storage.
- If the user asks for CSV import or export, install `csv-parse` and `csv-stringify`, if not specified otherwise. Stream large datasets and validate each imported record before persistence.
- If the user asks for rate limiting, install `rate-limiter-flexible`, if not specified otherwise. Use a shared store for multi-instance deployments and do not treat rate limits as authorization.
- If the user asks for OAuth, OpenID Connect, or signed JWT verification, prefer the identity provider's official SDK; otherwise install `jose`, if not specified otherwise. Never implement cryptographic signing or token verification manually.
- If the user asks for OpenAPI documentation generated from Zod contracts, install `@asteasolutions/zod-to-openapi`, if not specified otherwise. Keep the generated document derived from the route schemas rather than maintaining duplicate handwritten contracts.
- If the user asks for payment processing, install the payment provider's official server SDK and verify webhook signatures against the raw request body. Never trust browser-reported payment state.
- If the user asks for backend AI streaming, tool calls, or model-provider abstraction, install `ai` and the required official AI SDK provider package, if not specified otherwise. Keep provider keys server-only and expose the stream through a relative `/api` route.
- If the user asks for application caching, first verify that TanStack Query or correct HTTP cache headers do not already solve the problem. Add a shared Redis-backed cache only when server-side cross-request caching is required and define invalidation with the feature that owns the data.

Keep dependency decisions proportional to the requested behavior. A library recommendation does
not authorize new infrastructure, secrets, schemas, migrations, or background processes by itself.
