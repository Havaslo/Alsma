import assert from "node:assert/strict";
import test from "node:test";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import {
  createInstagramConnectionService,
  decryptInstagramToken,
  encryptInstagramToken,
} from "./instagram-connection.service.js";
import {
  MetaGraphRequestError,
  findTargetInstagram,
  getInstagramPageCandidate,
} from "./instagram-page-discovery.js";

const key = Buffer.alloc(32, 19).toString("base64");

test("Instagram access tokens are encrypted and can be decrypted", () => {
  const token = "meta-access-token-for-test-only";
  const encrypted = encryptInstagramToken(token, key, Buffer.alloc(12, 8));

  assert.notEqual(encrypted, token);
  assert.equal(decryptInstagramToken(encrypted, key), token);
});

test("Instagram token ciphertext cannot be opened with a different key", () => {
  const encrypted = encryptInstagramToken("private-token", key);
  const otherKey = Buffer.alloc(32, 20).toString("base64");

  assert.throws(() => decryptInstagramToken(encrypted, otherKey));
});

test("Instagram connection accepts the explicitly linked account without Page tasks", () => {
  assert.deepEqual(
    getInstagramPageCandidate({
      id: "page-id",
      access_token: "page-token",
      instagram_business_account: { id: "instagram-id" },
      tasks: ["ANALYZE"],
    }),
    {
      pageId: "page-id",
      pageToken: "page-token",
      instagramId: "instagram-id",
    },
  );
});

test("Instagram connection still requires a linked account and Page token", () => {
  assert.equal(
    getInstagramPageCandidate({
      id: "page-id",
      access_token: "page-token",
      tasks: ["CREATE_CONTENT"],
    }),
    null,
  );
  assert.equal(getInstagramPageCandidate(null), null);
});

const logger = { warn: () => undefined } as unknown as Logger;
const pageId = "443534006217972";
const instagramId = "17841411657361621";
const page = {
  id: pageId,
  access_token: "page-token-for-test-only",
  instagram_business_account: { id: instagramId },
};

test("Instagram OAuth asks for the five permissions shown in the Meta content setup", async () => {
  const service = createInstagramConnectionService({
    allowedOrigins: ["https://admin.example"],
    configuration: {
      appId: "facebook-app-id",
      appSecret: "app-secret-for-test-only",
      targetUsername: "alsmannov",
      targetPageId: pageId,
      redirectUri: "https://backend.example/api/instagram-publishing/callback",
      proxyUrl: "https://proxy.example",
      proxyKey: "proxy-key-for-test-only",
      tokenEncryptionKey: key,
      graphApiVersion: "v26.0",
    },
    database: {
      client: {
        instagramOAuthState: {
          deleteMany: async () => undefined,
          create: async () => undefined,
        },
      },
    } as unknown as Database,
    environment: "test",
    logger,
  });
  const result = await service.start("https://admin.example");
  assert.equal(result.configured, true);
  const scope = new URL(result.authorizationUrl!).searchParams.get("scope");
  assert.deepEqual(scope?.split(","), [
    "pages_show_list",
    "instagram_basic",
    "instagram_content_publish",
    "pages_read_engagement",
    "business_management",
  ]);
});

test("known Page ID resolves the linked Instagram directly, without a Page list", async () => {
  const calls: string[] = [];
  const result = await findTargetInstagram({
    graphGet: async (path, token) => {
      calls.push(path);
      if (path === pageId && token === "user-token") return page;
      if (path === instagramId && token === page.access_token)
        return { id: instagramId, username: "alsmannov" };
      throw new Error("Unexpected Graph request");
    },
    logger,
    targetPageId: pageId,
    targetUsername: "alsmannov",
    userToken: "user-token",
  });
  assert.deepEqual(calls, [pageId, instagramId]);
  assert.deepEqual(result, {
    source: "direct_page",
    target: {
      instagramId,
      pageId,
      pageToken: page.access_token,
      username: "alsmannov",
    },
  });
});

test("Page list pagination recovers when a known Page cannot be queried directly", async () => {
  const calls: Array<{ path: string; after?: string }> = [];
  const result = await findTargetInstagram({
    graphGet: async (path, _token, _fields, parameters) => {
      calls.push({ path, after: parameters?.after });
      if (path === pageId) throw new MetaGraphRequestError(403, 10);
      if (path === "me/accounts" && !parameters?.after)
        return {
          data: [{ id: "other-page" }],
          paging: { cursors: { after: "next-page" } },
        };
      if (path === "me/accounts" && parameters?.after === "next-page")
        return { data: [page] };
      if (path === instagramId)
        return { id: instagramId, username: "ALSMANNOV" };
      throw new Error("Unexpected Graph request");
    },
    logger,
    targetPageId: pageId,
    targetUsername: "alsmannov",
    userToken: "user-token",
  });
  assert.equal(result.target?.pageId, pageId);
  assert.deepEqual(calls, [
    { path: pageId, after: undefined },
    { path: "me/accounts", after: undefined },
    { path: "me/accounts", after: "next-page" },
    { path: instagramId, after: undefined },
  ]);
});

test("missing business Page is distinguished from a missing Instagram edge", async () => {
  const noPage = await findTargetInstagram({
    graphGet: async (path) => {
      if (path === pageId) throw new MetaGraphRequestError(403, 10);
      return { data: [] };
    },
    logger,
    targetPageId: pageId,
    targetUsername: "alsmannov",
    userToken: "user-token",
  });
  assert.equal(noPage.target, null);
  if (noPage.target === null)
    assert.equal(noPage.reason, "facebook_page_not_visible");

  const noInstagram = await findTargetInstagram({
    graphGet: async (path) =>
      path === pageId
        ? { id: pageId, access_token: "page-token-for-test-only" }
        : { data: [] },
    logger,
    targetPageId: pageId,
    targetUsername: "alsmannov",
    userToken: "user-token",
  });
  assert.equal(noInstagram.target, null);
  if (noInstagram.target === null)
    assert.equal(noInstagram.reason, "instagram_profile_not_visible");
});

test("the Instagram username must match before a Page token can be saved", async () => {
  const result = await findTargetInstagram({
    graphGet: async (path) =>
      path === pageId
        ? page
        : path === instagramId
          ? { id: instagramId, username: "another-profile" }
          : { data: [] },
    logger,
    targetPageId: pageId,
    targetUsername: "alsmannov",
    userToken: "user-token",
  });
  assert.equal(result.target, null);
  if (result.target === null)
    assert.equal(result.reason, "instagram_username_mismatch");
});

const mockCallback = (graphResponse: (url: URL) => Response) => {
  const persisted: Array<Record<string, unknown>> = [];
  const diagnostics: unknown[] = [];
  const service = createInstagramConnectionService({
    allowedOrigins: ["https://admin.example"],
    configuration: {
      appId: "facebook-app-id",
      appSecret: "app-secret-for-test-only",
      targetUsername: "alsmannov",
      targetPageId: pageId,
      redirectUri: "https://backend.example/api/instagram-publishing/callback",
      proxyUrl: "https://proxy.example",
      proxyKey: "proxy-key-for-test-only",
      tokenEncryptionKey: key,
      graphApiVersion: "v26.0",
    },
    database: {
      client: {
        instagramOAuthState: {
          updateMany: async () => ({ count: 1 }),
          findUnique: async () => ({
            redirectUri:
              "https://backend.example/api/instagram-publishing/callback",
            returnOrigin: "https://admin.example",
          }),
        },
        instagramChannelConnection: {
          upsert: async (value: Record<string, unknown>) => {
            persisted.push(value);
            return value;
          },
        },
      },
    } as unknown as Database,
    environment: "test",
    fetchImplementation: async (_url, init) => {
      const input = JSON.parse(String(init?.body)) as { url: string };
      return graphResponse(new URL(input.url));
    },
    logger: {
      warn: (metadata: unknown) => diagnostics.push(metadata),
    } as unknown as Logger,
  });
  return { service, persisted, diagnostics };
};

const oauthTokens = (url: URL): Response | null => {
  if (!url.pathname.endsWith("/oauth/access_token")) return null;
  return Response.json(
    url.searchParams.has("code")
      ? { access_token: "short-token-for-test-only" }
      : { access_token: "user-token-for-test-only", expires_in: 3600 },
  );
};

test("callback stores only the matching Instagram and encrypts its Page token", async () => {
  const { service, persisted } = mockCallback((url) => {
    const token = oauthTokens(url);
    if (token) return token;
    if (url.pathname.endsWith(`/${pageId}`)) return Response.json(page);
    if (url.pathname.endsWith(`/${instagramId}`))
      return Response.json({ id: instagramId, username: "alsmannov" });
    throw new Error(`Unexpected Graph path ${url.pathname}`);
  });

  const result = await service.complete({
    state: "test-state",
    code: "test-code",
  });
  assert.equal(result.result, "connected");
  assert.equal(persisted.length, 1);
  const created = persisted[0]?.create as Record<string, unknown>;
  assert.equal(created.instagramUserId, instagramId);
  assert.equal(created.facebookPageId, pageId);
  assert.equal(created.username, "alsmannov");
  assert.equal(
    decryptInstagramToken(String(created.encryptedAccessToken), key),
    page.access_token,
  );
  assert.notEqual(created.encryptedAccessToken, page.access_token);
});

test("callback reports absent Meta grants without saving tokens or logging them", async () => {
  const { service, persisted, diagnostics } = mockCallback((url) => {
    const token = oauthTokens(url);
    if (token) return token;
    if (url.pathname.endsWith(`/${pageId}`))
      return Response.json({ error: { code: 10 } }, { status: 403 });
    if (url.pathname.endsWith("/me/accounts"))
      return Response.json({ data: [] });
    if (url.pathname.endsWith("/me/permissions"))
      return Response.json({
        data: [
          "pages_show_list",
          "instagram_basic",
          "instagram_content_publish",
          "pages_read_engagement",
        ].map((permission) => ({ permission, status: "granted" })),
      });
    throw new Error(`Unexpected Graph path ${url.pathname}`);
  });

  const result = await service.complete({
    state: "test-state",
    code: "test-code",
  });
  assert.equal(result.result, "instagram_permissions_missing");
  assert.equal(persisted.length, 0);
  assert.match(JSON.stringify(diagnostics), /business_management/u);
  assert.doesNotMatch(JSON.stringify(diagnostics), /user-token-for-test-only/u);
});
