# VK ID photo access: server renewal

The primary photo connection button now starts `/vk-photo-connection/vkid/start`.
Previously it started legacy OAuth, issuing temporary access without a refresh token.
Legacy redirect/manual endpoints remain available only in the collapsed diagnostics section.
Browser renewal is no longer imported or executed by the connection card.

VK ID activation requires code + PKCE exchange, `photos` scope, a successful
`photos.getWallUploadServer`, a real refresh, a second photo preflight and encrypted
persistence. Failure preserves legacy credentials. VK ID credentials are preferred
by `vkPhotoConnection.getToken()` once activated; refresh failure does not silently
fall back to legacy.

Before photo requests the backend refreshes access with less than 120 seconds left.
PostgreSQL advisory transaction locks serialize replicas; the record is reread under
the lock and both rotated tokens are saved together. Explicit VK error 5 from
`photos.getWallUploadServer` or `photos.saveWallPhoto` permits one refresh and one
request retry. A token already replaced by another replica is reused. Errors 15/27
never trigger refresh. Community-authenticated `wall.post` and its existing guid
remain unchanged and are never automatically retried.

The admin-only status exposes the selected source, expiry, refresh timestamp,
callback URL and safe attempt stage/result. It never exposes tokens or ciphertext.
An authorization attempt without a callback after ten minutes reports
`CALLBACK_NOT_RECEIVED`. This describes the observed incomplete flow, not proof
that the redirect registration is the cause.

## External prerequisites

App 54881630 must allow `photos` and register exactly:

`https://8dd6f7cf-ea71-419d-a99c-5f6416bace1f--b80b0d0e.projects.amazi.pro/api/vk-photo-connection/vkid/callback`

After deployment the community administrator must connect once using the primary
button. VK ID is active only after `VKID_CONNECTED`, `activeSource=vkid` and
`photoReady=true`. A verified business profile or presence of a refresh token does
not itself grant photo access. Mock tests cannot confirm these external permissions.

## Validation and deployment

71 backend VK/content-plan tests and one frontend primary-button test pass, including
backend-only publication after refresh, early auth rejection at saveWallPhoto,
rotation/concurrency, failed candidate preservation and single wall.post invocation.
Frontend/backend type checks and builds pass; Prisma schema validation passes.
Frontend formatting and changed-file lint pass. Existing repository failures remain:
backend formatting in agent.gateway.ts, content-plan-blog-publisher.ts,
content-plan-file-parser.ts, vk-direct-factory-test.ts; frontend lint in RequestChat.tsx.

No real VK publication or migrations were executed. Production was not restarted:
server.ts unconditionally invokes `runDatabaseMigrations()` before starting the
scheduler, so deployment would violate the explicit no-migrations constraint.
