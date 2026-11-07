import assert from "node:assert/strict";
import test from "node:test";

import { readConfig } from "./config.js";

const baseEnvironment: NodeJS.ProcessEnv = {
  AMAZI_STORAGE_API_URL: "https://storage.example",
  AMAZI_STORAGE_PROJECT_TOKEN: "x".repeat(32),
  CORS_ALLOWED_ORIGINS: "https://alsma.ru",
  DATABASE_URL: "postgresql://user:password@localhost:5432/alsma",
};

test("development allows the exact Amazi preview host", () => {
  const config = readConfig({
    ...baseEnvironment,
    AMAZI_PREVIEW_FRONTEND_HOST: "project--frontend.preview.amazi.pro",
    NODE_ENV: "development",
  });

  assert.deepEqual(config.corsAllowedOrigins, [
    "https://alsma.ru",
    "https://project--frontend.preview.amazi.pro",
  ]);
});

test("production does not add the Amazi preview host to CORS", () => {
  const config = readConfig({
    ...baseEnvironment,
    AMAZI_PREVIEW_FRONTEND_HOST: "project--frontend.preview.amazi.pro",
    NODE_ENV: "production",
  });

  assert.deepEqual(config.corsAllowedOrigins, ["https://alsma.ru"]);
});

test("Eptera remains enabled by default and can be paused by configuration", () => {
  assert.equal(readConfig(baseEnvironment).epteraEnabled, true);
  assert.equal(
    readConfig({ ...baseEnvironment, EPTERA_ENABLED: "false" }).epteraEnabled,
    false,
  );
});

test("blank optional Meta credentials do not prevent backend startup", () => {
  const config = readConfig({
    ...baseEnvironment,
    META_INSTAGRAM_APP_ID: "",
    META_INSTAGRAM_APP_SECRET: "   ",
  });

  assert.equal(config.instagramPublishing.appId, undefined);
  assert.equal(config.instagramPublishing.appSecret, undefined);
});

test("Instagram discovery uses the explicitly selected Facebook Page ID", () => {
  const config = readConfig({
    ...baseEnvironment,
    META_INSTAGRAM_TARGET_PAGE_ID: "443534006217972",
  });
  assert.equal(config.instagramPublishing.targetPageId, "443534006217972");
});

test("Instagram image proxy is read separately from the Graph outbound proxy", () => {
  const config = readConfig({
    ...baseEnvironment,
    INSTAGRAM_MEDIA_PROXY_URL: "https://gateway.example/v1/inbound-proxy/route",
  });
  assert.equal(
    config.instagramPublishing.mediaProxyUrl,
    "https://gateway.example/v1/inbound-proxy/route",
  );
  assert.equal(config.instagramPublishing.proxyUrl, undefined);
});

test("ALSMA production supplies only public VK ID settings", () => {
  const config = readConfig({ ...baseEnvironment, NODE_ENV: "production" });
  assert.equal(config.vk.photoOAuth.vkIdAppId, "54881630");
  assert.equal(
    config.vk.photoOAuth.vkIdRedirectUri,
    "https://8dd6f7cf-ea71-419d-a99c-5f6416bace1f--b80b0d0e.projects.amazi.pro/api/vk-photo-connection/vkid/callback",
  );
  assert.equal(config.vk.photoOAuth.encryptionKey, undefined);
  assert.equal(readConfig(baseEnvironment).vk.photoOAuth.vkIdAppId, undefined);
  assert.equal(
    readConfig({
      ...baseEnvironment,
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://other.example",
    }).vk.photoOAuth.vkIdAppId,
    undefined,
  );
});

test("VK ID overrides never mix another application with ALSMA callback", () => {
  const config = readConfig({
    ...baseEnvironment,
    NODE_ENV: "production",
    VK_PHOTO_VKID_APP_ID: "123",
  });
  assert.equal(config.vk.photoOAuth.vkIdAppId, "123");
  assert.equal(config.vk.photoOAuth.vkIdRedirectUri, undefined);
  const full = readConfig({
    ...baseEnvironment,
    NODE_ENV: "production",
    VK_PHOTO_VKID_APP_ID: "123",
    VK_PHOTO_VKID_REDIRECT_URI: "https://other.example/callback",
  });
  assert.equal(
    full.vk.photoOAuth.vkIdRedirectUri,
    "https://other.example/callback",
  );
});
