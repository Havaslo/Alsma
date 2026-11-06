import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { photoAuthDiagnostic } from "./vk-photo-auth-diagnostic.js";
import { VkApiError, createVkClient } from "./vk.client.js";

export type VkPhotoOAuthConfiguration = {
  readonly appId?: string;
  readonly appSecret?: string;
  readonly redirectUri?: string;
  readonly encryptionKey?: string;
};

const savedSchema = z.object({
  ciphertext: z.string(),
  expiresAt: z.number().nullable(),
  connectedAt: z.string(),
});
const stateSchema = z.object({
  origin: z.string().url(),
  redirectUri: z.string().url(),
  groupId: z.string(),
  expiresAt: z.number(),
  mode: z.enum(["redirect", "manual"]).default("redirect"),
  adminId: z.string().optional(),
});
const manualRedirectUri = "https://oauth.vk.com/blank.html";
const keyBytes = (key: string) => {
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32)
    throw new Error("VK photo encryption key must contain 32 bytes");
  return bytes;
};
const seal = (token: string, key: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(key), iv);
  cipher.setAAD(Buffer.from("alsma-vk-photo-v1"));
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
};
const unseal = (value: string, key: string) => {
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Invalid VK photo connection");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    keyBytes(key),
    Buffer.from(iv, "base64url"),
  );
  cipher.setAAD(Buffer.from("alsma-vk-photo-v1"));
  cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    cipher.update(Buffer.from(encrypted, "base64url")),
    cipher.final(),
  ]).toString("utf8");
};

export const createVkPhotoConnectionService = (options: {
  readonly database: Database;
  readonly configuration: VkPhotoOAuthConfiguration;
  readonly allowedOrigins: readonly string[];
  readonly groupId?: string;
  readonly communityToken?: string;
  readonly fallbackPhotoToken?: string;
  readonly logger: Logger;
}) => {
  const config = options.configuration;
  const connectionKey = `vk.photo.connection.${options.groupId ?? "unconfigured"}`;
  const statePrefix = "vk.photo.oauth.state.";
  // Report names only: this status is admin-only and must never expose values.
  const missingConfiguration = Object.entries({
    VK_PHOTO_OAUTH_APP_ID: config.appId,
    VK_PHOTO_OAUTH_APP_SECRET: config.appSecret,
    VK_PHOTO_OAUTH_REDIRECT_URI: config.redirectUri,
    VK_PHOTO_TOKEN_ENCRYPTION_KEY: config.encryptionKey,
    VK_GROUP_ID: options.groupId,
    VK_ACCESS_TOKEN: options.communityToken,
  })
    .filter(([, value]) => !value)
    .map(([name]) => name);
  const configured = missingConfiguration.length === 0;
  const fallbackOrigin =
    options.allowedOrigins.find(
      (origin) => new URL(origin).hostname === "alsma.ru",
    ) ?? options.allowedOrigins[0];
  const read = async () => {
    const row = await options.database.client.appSetting.findUnique({
      where: { key: connectionKey },
    });
    if (!row) return null;
    const parsed = savedSchema.safeParse(row.value);
    if (!parsed.success) throw new Error("Invalid VK photo connection");
    return parsed.data;
  };
  const getToken = async () => {
    const saved = await read();
    if (!saved) return options.fallbackPhotoToken;
    if (saved.expiresAt !== null && saved.expiresAt <= Date.now())
      throw new VkApiError(5, "VK photo upload access token has expired");
    if (!config.encryptionKey)
      throw new Error("VK photo encryption is not configured");
    return unseal(saved.ciphertext, config.encryptionKey);
  };
  const verify = async (token: string) =>
    createVkClient({
      accessToken: options.communityToken,
      photoUploadAccessToken: token,
      logger: options.logger,
      singleAttempt: true,
    }).verifyWallPhotoUpload(options.groupId!);

  const status = async () => {
    const saved = await read();
    const expired =
      saved?.expiresAt !== null &&
      saved?.expiresAt !== undefined &&
      saved.expiresAt <= Date.now();
    let photoReady = false;
    let reason: string | null = expired ? "EXPIRED" : null;
    try {
      const token = await getToken();
      if (token && options.groupId && options.communityToken) {
        await verify(token);
        photoReady = true;
      } else reason = "PHOTO_TOKEN_MISSING";
    } catch (error) {
      reason = photoAuthDiagnostic(error);
      if (reason === "UNKNOWN" && error instanceof VkApiError)
        reason = "PHOTO_ACCESS_DENIED";
    }
    return {
      configured,
      missingConfiguration,
      photoReady,
      reason,
      connectedAt: saved?.connectedAt ?? null,
      expiresAt: saved?.expiresAt
        ? new Date(saved.expiresAt).toISOString()
        : null,
    };
  };

  const start = async (origin: string | undefined, manualAdminId?: string) => {
    if (!configured)
      throw new HttpError(
        409,
        "VK_PHOTO_OAUTH_NOT_CONFIGURED",
        "Сначала настройте серверное подключение приложения VK.",
      );
    if (!origin || !options.allowedOrigins.includes(origin))
      throw new HttpError(
        403,
        "VK_PHOTO_ORIGIN_DENIED",
        "Недопустимый адрес страницы подключения VK.",
      );
    const redirectUri = manualAdminId ? manualRedirectUri : config.redirectUri!;
    const state = randomBytes(32).toString("base64url");
    const key = statePrefix + createHash("sha256").update(state).digest("hex");
    await options.database.client.appSetting.deleteMany({
      where: {
        key: { startsWith: statePrefix },
        updatedAt: { lt: new Date(Date.now() - 10 * 60_000) },
      },
    });
    await options.database.client.appSetting.create({
      data: {
        key,
        value: {
          origin,
          groupId: options.groupId!,
          redirectUri,
          mode: manualAdminId ? "manual" : "redirect",
          ...(manualAdminId ? { adminId: manualAdminId } : {}),
          expiresAt: Date.now() + 10 * 60_000,
        },
      },
    });
    const url = new URL("https://oauth.vk.com/authorize");
    url.search = new URLSearchParams({
      client_id: config.appId!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "photos",
      state,
      display: "page",
      v: "5.199",
    }).toString();
    return { authorizationUrl: url.toString() };
  };

  const complete = async (input: {
    state?: string;
    code?: string;
    error?: string;
    manualAdminId?: string;
    manualOrigin?: string;
  }) => {
    const fallback = { origin: fallbackOrigin, result: "INVALID_STATE" };
    if (!input.state || input.state.length > 256) return fallback;
    const key =
      statePrefix + createHash("sha256").update(input.state).digest("hex");
    const row = await options.database.client.appSetting.findUnique({
      where: { key },
    });
    if (!row) return fallback;
    const state = stateSchema.safeParse(row.value);
    if (
      !state.success ||
      state.data.expiresAt <= Date.now() ||
      !options.allowedOrigins.includes(state.data.origin) ||
      state.data.groupId !== options.groupId ||
      (state.data.mode === "manual"
        ? !input.manualAdminId ||
          state.data.adminId !== input.manualAdminId ||
          state.data.origin !== input.manualOrigin ||
          state.data.redirectUri !== manualRedirectUri
        : Boolean(input.manualAdminId) ||
          state.data.redirectUri !== config.redirectUri)
    )
      return fallback;
    // Claim once across replicas after validating the initiating admin.
    const claimed = await options.database.client.appSetting.deleteMany({
      where: { key, updatedAt: row.updatedAt },
    });
    if (claimed.count !== 1) return fallback;
    const origin = state.data.origin;
    if (input.error) return { origin, result: "AUTHORIZATION_DENIED" };
    if (!input.code || !configured) return { origin, result: "NOT_CONFIGURED" };
    try {
      // Exchange on the backend, then verify actual provider/IP compatibility.
      // photos only: wall.post continues to use the separate community token.
      const response = await fetch("https://oauth.vk.com/access_token", {
        method: "POST",
        body: new URLSearchParams({
          client_id: config.appId!,
          client_secret: config.appSecret!,
          redirect_uri: state.data.redirectUri,
          code: input.code,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
      const data = z
        .object({
          access_token: z.string().min(20),
          expires_in: z.number().int().nonnegative(),
        })
        .safeParse(await response.json().catch(() => null));
      if (!response.ok || !data.success)
        return { origin, result: "CODE_EXCHANGE_DENIED" };
      await verify(data.data.access_token);
      const value = {
        ciphertext: seal(data.data.access_token, config.encryptionKey!),
        expiresAt:
          data.data.expires_in > 0
            ? Date.now() + data.data.expires_in * 1000
            : null,
        connectedAt: new Date().toISOString(),
      };
      await options.database.client.appSetting.upsert({
        where: { key: connectionKey },
        create: { key: connectionKey, value },
        update: { value },
      });
      return { origin, result: "CONNECTED" };
    } catch (error) {
      const reason = photoAuthDiagnostic(error);
      options.logger.warn(
        { reason, vkCode: error instanceof VkApiError ? error.code : null },
        "VK server photo connection failed",
      );
      return {
        origin,
        result: reason === "UNKNOWN" ? "PHOTO_ACCESS_DENIED" : reason,
      };
    }
  };
  const startManual = (origin: string | undefined, adminId: string) => {
    if (!adminId)
      throw new HttpError(401, "ADMIN_SESSION_INVALID", "Войдите снова.");
    return start(origin, adminId);
  };
  const completeManual = async (
    callbackUrl: string,
    origin: string | undefined,
    adminId: string,
  ) => {
    const invalid = { result: "INVALID_CALLBACK" };
    let url: URL;
    try {
      url = new URL(callbackUrl);
    } catch {
      return invalid;
    }
    if (
      url.protocol !== "https:" ||
      !["oauth.vk.com", "oauth.vk.ru"].includes(url.hostname) ||
      url.pathname !== "/blank.html" ||
      url.port ||
      url.username ||
      url.password
    )
      return invalid;
    const query = new URLSearchParams(url.search);
    const fragment = new URLSearchParams(url.hash.slice(1));
    const params = new URLSearchParams([...query, ...fragment]);
    // This flow accepts a one-use code, never a browser-issued access token.
    if (params.has("access_token")) return { result: "TOKEN_INSTEAD_OF_CODE" };
    if (
      ["state", "code", "error"].some((name) => params.getAll(name).length > 1)
    )
      return invalid;
    const code = params.get("code") ?? undefined;
    const state = params.get("state") ?? undefined;
    const error = params.get("error") ?? undefined;
    if (!state || (!code && !error) || (code?.length ?? 0) > 4096)
      return invalid;
    const outcome = await complete({
      code,
      state,
      error,
      manualAdminId: adminId,
      manualOrigin: origin,
    });
    return { result: outcome.result };
  };
  return { start, startManual, complete, completeManual, status, getToken };
};
export type VkPhotoConnectionService = ReturnType<
  typeof createVkPhotoConnectionService
>;
